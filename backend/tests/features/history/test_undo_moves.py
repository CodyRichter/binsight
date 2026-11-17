import pytest
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service
from app.features.items import service as items
from app.features.items.schemas import ItemMove
from app.features.locations import service as locations
from app.features.locations.schemas import LocationMove
from app.models import Actor, Item, Location
from tests import builders
from tests.builders import AcceptanceHome


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _move_item(engine: Engine, item_id: str, location_id: str) -> str:
    with open_write_session(engine) as session:
        move = ItemMove(location_id=location_id)
        return items.move_item(session, item_id, move, Actor.app, builders.NOW).history_entry_id


def _move_location(engine: Engine, location_id: str, parent_id: str) -> str:
    with open_write_session(engine) as session:
        move = LocationMove(parent_id=parent_id)
        moved = locations.move_location(session, location_id, move, Actor.app, builders.NOW)
        return moved.history_entry_id


def _undo(engine: Engine, settings: Settings, entry_id: str) -> None:
    with open_write_session(engine) as session:
        service.undo(session, settings, entry_id, Actor.app, builders.NOW)


def _refusal(engine: Engine, settings: Settings, entry_id: str) -> str:
    with pytest.raises(AppError) as refused:
        _undo(engine, settings, entry_id)
    return refused.value.code


def test_undoing_an_item_move_puts_it_back(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _undo(migrated_engine, settings, _move_item(migrated_engine, home.usb_c_charger, home.tools))
    with open_read_session(migrated_engine) as session:
        charger = session.get(Item, home.usb_c_charger)
        assert charger is not None
        assert charger.home_location_id == home.cables


def test_undoing_a_bin_move_puts_it_back_with_everything_in_it(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _undo(migrated_engine, settings, _move_location(migrated_engine, home.cables, home.garage))
    with open_read_session(migrated_engine) as session:
        cables = session.get(Location, home.cables)
        assert cables is not None
        assert cables.parent_id == home.shelf
        cable = items.get_item(session, home.hdmi_cable)
    assert [step.name for step in cable.path] == ["Home", "Garage", "Shelf 2", "Cables"]


def test_a_move_moved_again_since_cannot_be_undone(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    first = _move_item(migrated_engine, home.usb_c_charger, home.tools)
    _move_item(migrated_engine, home.usb_c_charger, home.shelf)
    assert _refusal(migrated_engine, settings, first) == "changed_since"


def test_an_undo_that_would_put_a_location_inside_itself_is_refused(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    # Cables leaves Shelf 2, then Shelf 2 goes into Cables: putting Cables back would loop.
    first = _move_location(migrated_engine, home.cables, home.garage)
    _move_location(migrated_engine, home.shelf, home.cables)
    assert _refusal(migrated_engine, settings, first) == "changed_since"
    with open_read_session(migrated_engine) as session:
        cables = session.get(Location, home.cables)
        assert cables is not None
        assert cables.parent_id == home.garage
