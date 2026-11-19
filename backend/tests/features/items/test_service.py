from datetime import datetime, timedelta

import pytest
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.history import service as history
from app.features.items import service
from app.features.items.schemas import ItemChanges
from app.models import HistoryEntry, Item, LocationType
from tests import builders
from tests.builders import APP_ACTOR


def _minute(minute: int) -> datetime:
    return builders.NOW + timedelta(minutes=minute)


def _cables(session: Session) -> str:
    home = builders.location(session, "Home")
    garage = builders.location(session, "Garage", home.id, LocationType.room)
    shelf = builders.location(session, "Shelf 2", garage.id, LocationType.shelf)
    return builders.location(session, "Cables", shelf.id).id


def _shelf_with_a_bin(engine: Engine) -> tuple[str, str]:
    with open_write_session(engine) as session:
        home = builders.location(session, "Home")
        shelf = builders.location(session, "Shelf 2", home.id, LocationType.shelf)
        cables = builders.location(session, "Cables", shelf.id)
        builders.item(session, "Drill", shelf.id, _minute(0))
        builders.item(session, "HDMI cable", cables.id, _minute(1))
    return shelf.id, cables.id


def _names(engine: Engine, location_id: str, everything_inside: bool) -> list[str | None]:
    with open_read_session(engine) as session:
        page = service.list_items(session, location_id, everything_inside, 50, None)
    return [item.name for item in page.items]


def _create_then_refuse(engine: Engine) -> None:
    with open_write_session(engine) as session:
        builders.item(session, "HDMI cable")
        raise RuntimeError("refused")


def test_an_item_shows_the_full_path_of_its_location(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        created = builders.item(session, "HDMI cable", _cables(session))
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, created.id)
    assert [step.name for step in item.path] == ["Home", "Garage", "Shelf 2", "Cables"]
    assert item.path == created.path


def test_quantity_starts_at_one(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        assert builders.item(session).quantity == 1


def test_an_item_with_no_home_location_has_an_empty_path(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session)
    assert (item.home_location_id, item.path) == (None, [])


def test_an_unknown_home_location_is_refused(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_write_session(migrated_engine) as session:
        builders.item(session, home_location_id="made-up")
    assert refusal.value.code == "location_not_found"


def test_an_unknown_item_is_not_found(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_read_session(migrated_engine) as session:
        service.get_item(session, "made-up")
    assert refusal.value.code == "item_not_found"


def test_a_location_lists_only_its_direct_items(migrated_engine: Engine) -> None:
    shelf_id, _ = _shelf_with_a_bin(migrated_engine)
    assert _names(migrated_engine, shelf_id, everything_inside=False) == ["Drill"]


def test_everything_inside_adds_the_items_beneath(migrated_engine: Engine) -> None:
    shelf_id, _ = _shelf_with_a_bin(migrated_engine)
    assert _names(migrated_engine, shelf_id, everything_inside=True) == ["Drill", "HDMI cable"]


def test_listing_an_unknown_location_is_refused(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_read_session(migrated_engine) as session:
        service.list_items(session, "made-up", False, 50, None)
    assert refusal.value.code == "location_not_found"


def test_paging_walks_every_item_once(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home")
        names = [f"Cable {number}" for number in range(5)]
        for number, name in enumerate(names):
            builders.item(session, name, home.id, _minute(number // 2))
    seen: list[str | None] = []
    cursor: str | None = None
    with open_read_session(migrated_engine) as session:
        for _ in range(3):
            page = service.list_items(session, home.id, False, 2, cursor)
            seen.extend(item.name for item in page.items)
            cursor = page.next_cursor
    assert sorted(name or "" for name in seen) == names
    assert cursor is None


def test_a_cursor_the_app_did_not_make_is_refused(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session, "Home")
    with pytest.raises(AppError) as refusal, open_read_session(migrated_engine) as session:
        service.list_items(session, home.id, False, 50, "not-a-cursor")
    assert refusal.value.code == "invalid_cursor"


def test_creating_an_item_records_it_in_history(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session, "HDMI cable")
    with open_read_session(migrated_engine) as session:
        entry = session.get_one(HistoryEntry, item.history_entry_id)
        assert (entry.action, entry.actor) == ("item.created", "app")
        assert [(change.record_id, change.after) for change in entry.changes] == [
            (item.id, {"name": "HDMI cable", "quantity": 1, "home_location_id": None})
        ]


def test_an_item_and_its_history_are_kept_or_lost_together(migrated_engine: Engine) -> None:
    with pytest.raises(RuntimeError, match="refused"):
        _create_then_refuse(migrated_engine)
    with open_read_session(migrated_engine) as session:
        assert session.scalar(select(func.count(Item.id))) == 0
        assert session.scalar(select(func.count(HistoryEntry.id))) == 0


def test_changing_the_quantity_is_recorded_with_before_and_after(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        created = builders.item(session, "HDMI cable")
        changes = ItemChanges(quantity=4)
        service.update_item(session, created.id, changes, APP_ACTOR, _minute(1))
    with open_read_session(migrated_engine) as session:
        assert service.get_item(session, created.id).quantity == 4
        newest = history.list_item_history(session, created.id, 50, None).items[0]
    assert newest.action == "item.updated"
    assert [(change.before, change.after) for change in newest.changes] == [
        ({"quantity": 1}, {"quantity": 4})
    ]


def test_changing_an_unknown_item_is_refused(migrated_engine: Engine) -> None:
    with pytest.raises(AppError) as refusal, open_write_session(migrated_engine) as session:
        service.update_item(session, "made-up", ItemChanges(quantity=2), APP_ACTOR, builders.NOW)
    assert refusal.value.code == "item_not_found"
