from collections.abc import Callable
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.items import service
from app.features.items.schemas import ItemChanges, ItemMove
from app.features.locations import service as locations
from app.features.search import service as search
from app.features.search.schemas import Search
from app.models import MCP_ACTOR, HistoryEntry
from tests import builders
from tests.builders import APP_ACTOR, AcceptanceHome


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _delete(engine: Engine, item_id: str) -> str:
    with open_write_session(engine) as session:
        return service.delete_item(session, item_id, APP_ACTOR, builders.NOW).history_entry_id


def _refusal_code(engine: Engine, action: Callable[[Session], object]) -> str:
    with pytest.raises(AppError) as refused, open_write_session(engine) as session:
        action(session)
    assert refused.value.status == 409
    return refused.value.code


def test_a_deleted_item_leaves_its_location_s_list_and_count(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _delete(migrated_engine, home.usb_c_charger)
    with open_read_session(migrated_engine) as session:
        listed = service.list_items(session, home.cables, False, 50, None).items
        cables = locations.get_location(session, home.cables)
        shelf = locations.get_location(session, home.shelf)
    assert [item.name for item in listed] == ["HDMI cable"]
    assert cables.direct_item_count == 1
    assert shelf.item_count == 1


def test_a_deleted_item_is_not_found_by_search(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _delete(migrated_engine, home.hdmi_cable)
    with open_read_session(migrated_engine) as session:
        found = search.search_home(
            session, Search(query="hdmi"), date(2026, 11, 16), 50, None
        ).results
    assert found == []


def test_a_deleted_item_leaves_the_inbox_and_its_count(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        waiting = builders.item(session, "Tape").id
    _delete(migrated_engine, waiting)
    with open_read_session(migrated_engine) as session:
        assert service.list_inbox(session, 50, None).items == []
        assert service.count_inbox(session).count == 0


def test_a_deleted_item_can_still_be_read_and_says_when_it_was_deleted(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _delete(migrated_engine, home.hdmi_cable)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, home.hdmi_cable)
    assert item.deleted_at == builders.NOW
    assert [step.name for step in item.path] == ["Home", "Garage", "Shelf 2", "Cables"]


def test_restoring_puts_it_back_in_its_location(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _delete(migrated_engine, home.usb_c_charger)
    with open_write_session(migrated_engine) as session:
        restored = service.restore_item(session, home.usb_c_charger, MCP_ACTOR, builders.NOW)
    assert restored.deleted_at is None
    with open_read_session(migrated_engine) as session:
        listed = service.list_items(session, home.cables, False, 50, None).items
        entry = session.get(HistoryEntry, restored.history_entry_id)
        assert entry is not None
        assert (entry.action, entry.actor) == ("item.restored", MCP_ACTOR.kind)
    assert [item.name for item in listed] == ["HDMI cable", "USB-C charger"]


def test_deleting_is_one_history_entry_by_its_actor(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    entry_id = _delete(migrated_engine, home.hdmi_cable)
    with open_read_session(migrated_engine) as session:
        entry = session.get(HistoryEntry, entry_id)
        assert entry is not None
        assert (entry.action, entry.actor) == ("item.deleted", APP_ACTOR.kind)
        assert [(c.before, c.after) for c in entry.changes] == [
            ({"deleted_at": None}, {"deleted_at": builders.NOW.isoformat()})
        ]


def test_a_deleted_item_cannot_be_changed_moved_or_deleted_again(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _delete(migrated_engine, home.hdmi_cable)
    item_id, now = home.hdmi_cable, builders.NOW
    refusals = [
        _refusal_code(
            migrated_engine,
            lambda session: service.update_item(
                session, item_id, ItemChanges(quantity=5), APP_ACTOR, now
            ),
        ),
        _refusal_code(
            migrated_engine,
            lambda session: service.move_item(
                session, item_id, ItemMove(location_id=home.tools), APP_ACTOR, now
            ),
        ),
        _refusal_code(
            migrated_engine, lambda session: service.delete_item(session, item_id, APP_ACTOR, now)
        ),
    ]
    assert refusals == ["item_deleted"] * 3


def test_an_item_that_was_never_deleted_cannot_be_restored(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    refused = _refusal_code(
        migrated_engine,
        lambda session: service.restore_item(session, home.hdmi_cable, APP_ACTOR, builders.NOW),
    )
    assert refused == "not_deleted"


def test_deleting_and_restoring_through_the_api(
    signed_in: TestClient, home_through_api: tuple[str, str]
) -> None:
    location_id, item_id = home_through_api
    deleted = signed_in.delete(f"/api/items/{item_id}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted_at"].endswith("Z")
    listed = signed_in.get("/api/items", params={"location_id": location_id}).json()
    assert listed["items"] == []
    again = signed_in.delete(f"/api/items/{item_id}")
    assert (again.status_code, again.json()["error"]["code"]) == (409, "item_deleted")
    restored = signed_in.post(f"/api/items/{item_id}/restore")
    assert restored.status_code == 200
    assert restored.json()["deleted_at"] is None
    missing = signed_in.delete("/api/items/nothing")
    assert (missing.status_code, missing.json()["error"]["code"]) == (404, "item_not_found")


@pytest.fixture
def home_through_api(signed_in: TestClient) -> tuple[str, str]:
    location_id: str = signed_in.post(
        "/api/locations", json={"name": "Home", "type": "site"}
    ).json()["id"]
    item = signed_in.post("/api/items", json={"name": "Tape", "home_location_id": location_id})
    return location_id, item.json()["id"]
