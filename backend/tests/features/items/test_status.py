from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service as history
from app.features.items import service
from app.features.items.schemas import ItemFound
from app.models import Actor, HistoryEntry, ItemStatus
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _missing(engine: Engine, item_id: str) -> str:
    with open_write_session(engine) as session:
        marked = service.mark_item_missing(session, item_id, Actor.app, LATER)
    return marked.history_entry_id


def _found(engine: Engine, item_id: str, location_id: str) -> str:
    with open_write_session(engine) as session:
        found = ItemFound(location_id=location_id)
        return service.mark_item_found(
            session, item_id, found, Actor.mcp, LATER + timedelta(minutes=1)
        ).id


def test_a_missing_item_keeps_its_home_and_stays_listed(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    entry_id = _missing(migrated_engine, home.hdmi_cable)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, home.hdmi_cable)
        listed = service.list_items(session, home.cables, False, 50, None).items
        entry = session.get(HistoryEntry, entry_id)
        assert entry is not None
        assert (entry.action, entry.actor) == ("item.marked_missing", Actor.app)
    assert (item.status, item.home_location_id) == (ItemStatus.missing, home.cables)
    assert [each.name for each in listed] == ["HDMI cable", "USB-C charger"]


def test_found_somewhere_else_moves_it_there_in_place(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _missing(migrated_engine, home.hdmi_cable)
    _found(migrated_engine, home.hdmi_cable, home.tools)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, home.hdmi_cable)
        page = history.list_item_history(session, home.hdmi_cable, 50, None)
    assert (item.status, item.home_location_id) == (ItemStatus.in_place, home.tools)
    assert (page.items[0].action, page.items[0].actor) == ("item.found", Actor.mcp)


def test_found_where_it_was_keeps_its_home(migrated_engine: Engine, home: AcceptanceHome) -> None:
    _missing(migrated_engine, home.hdmi_cable)
    _found(migrated_engine, home.hdmi_cable, home.cables)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, home.hdmi_cable)
    assert (item.status, item.home_location_id) == (ItemStatus.in_place, home.cables)


def test_undoing_found_makes_it_missing_where_it_was(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _missing(migrated_engine, home.hdmi_cable)
    with open_write_session(migrated_engine) as session:
        found = ItemFound(location_id=home.tools)
        entry_id = service.mark_item_found(
            session, home.hdmi_cable, found, Actor.app, builders.NOW
        ).history_entry_id
        history.undo(session, settings, entry_id, Actor.app, LATER)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, home.hdmi_cable)
    assert (item.status, item.home_location_id) == (ItemStatus.missing, home.cables)


def test_missing_and_found_are_refused_when_they_make_no_sense(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with pytest.raises(AppError) as not_missing:
        _found(migrated_engine, home.hdmi_cable, home.tools)
    _missing(migrated_engine, home.hdmi_cable)
    with pytest.raises(AppError) as already:
        _missing(migrated_engine, home.hdmi_cable)
    assert (not_missing.value.code, already.value.code) == ("not_missing", "already_missing")


def test_marking_missing_and_found_through_the_api(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    item_id = signed_in.post("/api/items", json={"name": "Tape", "home_location_id": site}).json()[
        "id"
    ]
    missing = signed_in.post(f"/api/items/{item_id}/mark-missing")
    assert (missing.status_code, missing.json()["status"]) == (200, "missing")
    found = signed_in.post(f"/api/items/{item_id}/mark-found", json={"location_id": site})
    assert (found.status_code, found.json()["status"]) == (200, "in_place")
    nowhere = signed_in.post(f"/api/items/{item_id}/mark-missing")
    signed_in.post(f"/api/items/{item_id}/mark-found", json={"location_id": "nowhere"})
    assert nowhere.status_code == 200
    gone = signed_in.post(f"/api/items/{item_id}/mark-found", json={"location_id": "nowhere"})
    assert (gone.status_code, gone.json()["error"]["code"]) == (404, "location_not_found")
