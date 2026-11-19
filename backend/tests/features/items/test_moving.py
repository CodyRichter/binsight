import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.items import service
from app.features.items.schemas import ItemMove, ItemMoved
from app.models import HistoryEntry
from tests import builders
from tests.builders import APP_ACTOR, AcceptanceHome


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _move(engine: Engine, item_id: str, location_id: str) -> ItemMoved:
    with open_write_session(engine) as session:
        return service.move_item(
            session, item_id, ItemMove(location_id=location_id), APP_ACTOR, builders.NOW
        )


def _refusal(engine: Engine, item_id: str, location_id: str) -> str:
    with pytest.raises(AppError) as refused:
        _move(engine, item_id, location_id)
    return refused.value.code


def test_a_moved_item_has_its_new_path(migrated_engine: Engine, home: AcceptanceHome) -> None:
    moved = _move(migrated_engine, home.usb_c_charger, home.tools)
    assert moved.home_location_id == home.tools
    assert [step.name for step in moved.path] == ["Home", "Garage", "Shelf 2", "Tools"]


def test_the_move_is_one_history_entry_by_the_app(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    moved = _move(migrated_engine, home.usb_c_charger, home.tools)
    with open_read_session(migrated_engine) as session:
        entry = session.get(HistoryEntry, moved.history_entry_id)
        assert entry is not None
        assert (entry.action, entry.actor) == ("item.moved", APP_ACTOR.kind)
        assert [(change.before, change.after) for change in entry.changes] == [
            ({"home_location_id": home.cables}, {"home_location_id": home.tools})
        ]


def test_moving_an_item_where_it_already_is_is_refused(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    assert _refusal(migrated_engine, home.usb_c_charger, home.cables) == "already_there"


def test_moving_to_an_unknown_location_or_an_unknown_item_is_refused(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    assert _refusal(migrated_engine, home.usb_c_charger, "made-up") == "location_not_found"
    assert _refusal(migrated_engine, "made-up", home.tools) == "item_not_found"


def test_the_move_route_answers_with_the_moved_item(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    room = {"name": "Garage", "type": "room", "parent_id": site}
    garage = signed_in.post("/api/locations", json=room).json()["id"]
    item = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": site}).json()
    response = signed_in.post(f"/api/items/{item['id']}/move", json={"location_id": garage})
    assert response.status_code == 200
    assert [step["name"] for step in response.json()["path"]] == ["Home", "Garage"]
    again = signed_in.post(f"/api/items/{item['id']}/move", json={"location_id": garage})
    assert (again.status_code, again.json()["error"]["code"]) == (409, "already_there")
