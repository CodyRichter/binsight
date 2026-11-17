from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError
from sqlalchemy import Engine, select

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.locations import service
from app.features.locations.schemas import NewLocation
from app.models import HistoryEntry, LocationType
from tests import builders


def _names(path: list[service.PathStep]) -> list[str]:
    return [step.name for step in path]


def _minute(minute: int) -> datetime:
    return builders.NOW + timedelta(minutes=minute)


def test_a_site_is_created_with_no_parent(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home")
    assert (home.type, home.parent_id) == (LocationType.site, None)
    assert _names(home.path) == ["Home"]


def test_a_location_other_than_a_site_needs_a_parent() -> None:
    with pytest.raises(ValidationError, match="A site has no parent"):
        NewLocation(name="Garage", type=LocationType.room)


def test_a_site_cannot_have_a_parent() -> None:
    with pytest.raises(ValidationError, match="A site has no parent"):
        NewLocation(name="Car", type=LocationType.site, parent_id="somewhere")


def test_an_unknown_parent_is_refused(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_write_session(migrated_engine) as session:
        builders.location(session, "Garage", parent_id="made-up")
    assert refusal.value.code == "location_not_found"


def test_an_unknown_location_is_not_found(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_read_session(migrated_engine) as session:
        service.get_location(session, "made-up")
    assert refusal.value.code == "location_not_found"


def test_the_list_holds_the_whole_tree_with_paths(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home", now=_minute(0))
        garage = builders.location(session, "Garage", home.id, LocationType.room, _minute(1))
        builders.location(session, "Shelf 2", garage.id, LocationType.shelf, _minute(2))
        builders.location(session, "Car", now=_minute(3))
    with open_read_session(migrated_engine) as session:
        tree = service.list_locations(session).locations
    assert [_names(location.path) for location in tree] == [
        ["Home"],
        ["Home", "Garage"],
        ["Home", "Garage", "Shelf 2"],
        ["Car"],
    ]
    assert tree[1].parent_id == home.id


def test_item_count_includes_everything_beneath(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home")
        garage = builders.location(session, "Garage", home.id, LocationType.room)
        shelf = builders.location(session, "Shelf 2", garage.id, LocationType.shelf)
        builders.item(session, "Drill", garage.id)
        builders.item(session, "HDMI cable", shelf.id)
        builders.item(session, "USB cable", shelf.id)
    with open_read_session(migrated_engine) as session:
        tree = {location.id: location for location in service.list_locations(session).locations}
    counts = [
        (tree[place.id].direct_item_count, tree[place.id].item_count)
        for place in (home, garage, shelf)
    ]
    assert counts == [(0, 3), (1, 3), (2, 2)]


def test_creating_a_location_records_it_in_history(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home")
    with open_read_session(migrated_engine) as session:
        entries = list(session.scalars(select(HistoryEntry)))
        assert [(entry.id, entry.action, entry.actor) for entry in entries] == [
            (home.history_entry_id, "location.created", "app")
        ]
        change = entries[0].changes[0]
        assert (change.record_type, change.record_id, change.before) == ("location", home.id, None)
        assert change.after == {"name": "Home", "type": "site", "parent_id": None, "summary": None}
