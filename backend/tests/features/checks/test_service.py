from datetime import timedelta

import pytest
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.checks import service
from app.features.checks.schemas import CheckLocation, LocationChecked
from app.features.history import service as history
from app.features.items import service as items
from app.features.items.schemas import ItemMove
from app.features.locations import service as locations
from app.models import Actor, HistoryEntry, ItemStatus
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _check(engine: Engine, location_id: str, missing: list[str] | None = None) -> LocationChecked:
    with open_write_session(engine) as session:
        check = CheckLocation(missing_item_ids=missing or [])
        return service.check_location(session, location_id, check, Actor.app, LATER)


def test_a_check_sets_when_the_location_and_its_items_were_last_checked(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    checked = _check(migrated_engine, home.cables)
    assert checked.last_checked_at == LATER
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, home.hdmi_cable).last_checked_at == LATER
        assert locations.get_location(session, home.shelf).last_checked_at is None
        assert locations.get_location(session, home.tools).last_checked_at is None


def test_a_location_never_checked_says_so(migrated_engine: Engine, home: AcceptanceHome) -> None:
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.cables).last_checked_at is None
        assert items.get_item(session, home.hdmi_cable).last_checked_at is None


def test_adding_or_moving_an_item_is_not_a_check(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Ethernet cable", home.tools)
        move = ItemMove(location_id=home.tools)
        items.move_item(session, home.usb_c_charger, move, Actor.app, LATER)
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.tools).last_checked_at is None


def test_the_latest_check_is_the_one_shown(migrated_engine: Engine, home: AcceptanceHome) -> None:
    _check(migrated_engine, home.cables)
    with open_write_session(migrated_engine) as session:
        later_still = LATER + timedelta(days=3)
        service.check_location(session, home.cables, CheckLocation(), Actor.mcp, later_still)
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.cables).last_checked_at == later_still


def test_items_not_found_are_marked_missing_in_the_same_entry(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    checked = _check(migrated_engine, home.cables, [home.usb_c_charger])
    assert [item.status for item in checked.marked_missing] == [ItemStatus.missing]
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, home.hdmi_cable).status == ItemStatus.in_place
        entry = session.get(HistoryEntry, checked.history_entry_id)
        assert entry is not None
        assert entry.action == "location.checked"
        assert sorted(change.record_type for change in entry.changes) == ["check", "item"]
        page = history.list_item_history(session, home.usb_c_charger, 50, None)
        assert page.items[0].action == "location.checked"


def test_one_undo_reverses_the_check_and_the_missing_items(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    checked = _check(migrated_engine, home.cables, [home.usb_c_charger])
    with open_write_session(migrated_engine) as session:
        history.undo(session, settings, checked.history_entry_id, Actor.app, LATER)
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.cables).last_checked_at is None
        assert items.get_item(session, home.usb_c_charger).status == ItemStatus.in_place


def test_only_items_directly_in_the_location_can_be_marked_missing(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with pytest.raises(AppError) as refused:
        _check(migrated_engine, home.shelf, [home.hdmi_cable])
    assert (refused.value.status, refused.value.code) == (422, "not_in_location")
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.shelf).last_checked_at is None


def test_a_check_of_a_location_that_does_not_exist_is_refused(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refused:
        _check(migrated_engine, "nowhere")
    assert refused.value.code == "location_not_found"
