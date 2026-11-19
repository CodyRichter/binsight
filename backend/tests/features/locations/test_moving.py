import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.items import service as items
from app.features.locations import service
from app.features.locations.schemas import LocationMove, LocationMoved
from app.models import HistoryEntry, Item, LocationType
from tests import builders
from tests.builders import APP_ACTOR, AcceptanceHome


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _move(engine: Engine, location_id: str, parent_id: str) -> LocationMoved:
    with open_write_session(engine) as session:
        return service.move_location(
            session, location_id, LocationMove(parent_id=parent_id), APP_ACTOR, builders.NOW
        )


def _refusal(engine: Engine, location_id: str, parent_id: str) -> str:
    with pytest.raises(AppError) as refused:
        _move(engine, location_id, parent_id)
    return refused.value.code


def test_everything_in_a_moved_bin_shows_the_new_path(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    moved = _move(migrated_engine, home.cables, home.garage)
    assert [step.name for step in moved.path] == ["Home", "Garage", "Cables"]
    with open_read_session(migrated_engine) as session:
        cable = items.get_item(session, home.hdmi_cable)
    assert [step.name for step in cable.path] == ["Home", "Garage", "Cables"]


def test_a_move_is_one_change_and_no_item_is_changed(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_read_session(migrated_engine) as session:
        cable = session.get(Item, home.hdmi_cable)
        assert cable is not None
        changed_at = cable.updated_at
    moved = _move(migrated_engine, home.cables, home.garage)
    with open_read_session(migrated_engine) as session:
        entry = session.get(HistoryEntry, moved.history_entry_id)
        cable = session.get(Item, home.hdmi_cable)
        assert entry is not None
        assert cable is not None
        assert entry.action == "location.moved"
        assert [(c.record_id, c.before, c.after) for c in entry.changes] == [
            (home.cables, {"parent_id": home.shelf}, {"parent_id": home.garage})
        ]
        assert cable.updated_at == changed_at


def test_a_location_cannot_move_into_itself_or_anything_inside_it(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    assert _refusal(migrated_engine, home.garage, home.garage) == "move_into_itself"
    assert _refusal(migrated_engine, home.garage, home.shelf) == "move_into_itself"
    assert _refusal(migrated_engine, home.garage, home.cables) == "move_into_itself"


def test_a_site_cannot_move(migrated_engine: Engine, home: AcceptanceHome) -> None:
    with open_write_session(migrated_engine) as session:
        car = builders.location(session, "Car").id
    assert _refusal(migrated_engine, home.home, car) == "site_cannot_move"


def test_moving_where_it_already_is_or_to_nowhere_is_refused(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    assert _refusal(migrated_engine, home.cables, home.shelf) == "already_there"
    assert _refusal(migrated_engine, home.cables, "made-up") == "location_not_found"
    assert _refusal(migrated_engine, "made-up", home.shelf) == "location_not_found"


def test_the_move_route_answers_and_refuses_with_a_clear_message(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    room = {"name": "Garage", "type": "room", "parent_id": site}
    garage = signed_in.post("/api/locations", json=room).json()["id"]
    shelf = {"name": "Shelf", "type": LocationType.shelf, "parent_id": garage}
    shelf_id = signed_in.post("/api/locations", json=shelf).json()["id"]
    refused = signed_in.post(f"/api/locations/{garage}/move", json={"parent_id": shelf_id})
    assert refused.status_code == 409
    assert refused.json()["error"]["message"] == (
        "A location can't be moved into itself or anything inside it."
    )
    other = signed_in.post("/api/locations", json={**room, "name": "Attic"}).json()["id"]
    moved = signed_in.post(f"/api/locations/{shelf_id}/move", json={"parent_id": other})
    assert moved.status_code == 200
    assert [step["name"] for step in moved.json()["path"]] == ["Home", "Attic", "Shelf"]
