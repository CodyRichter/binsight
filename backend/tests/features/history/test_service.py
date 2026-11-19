from datetime import timedelta

from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.features.history import service
from app.models import MCP_ACTOR
from tests import builders
from tests.builders import APP_ACTOR


def test_an_items_history_lists_its_entries_newest_first(migrated_engine: Engine) -> None:
    later = builders.NOW + timedelta(minutes=5)
    with open_write_session(migrated_engine) as session:
        item = builders.item(session, "HDMI cable")
        change = service.RecordChange("item", item.id, {"quantity": 1}, {"quantity": 3})
        counted = service.record(session, MCP_ACTOR, "item.quantity_changed", [change], later)
    with open_read_session(migrated_engine) as session:
        page = service.list_item_history(session, item.id, 50, None)
    assert [entry.id for entry in page.items] == [counted, item.history_entry_id]
    newest = page.items[0]
    assert (newest.actor, newest.at) == (MCP_ACTOR.kind, later)
    assert [(c.before, c.after) for c in newest.changes] == [({"quantity": 1}, {"quantity": 3})]
    assert page.next_cursor is None


def test_another_items_entries_are_left_out(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        cable = builders.item(session, "HDMI cable")
        builders.item(session, "Drill")
    with open_read_session(migrated_engine) as session:
        page = service.list_item_history(session, cable.id, 50, None)
    assert [entry.id for entry in page.items] == [cable.history_entry_id]


def test_history_pages_end_with_no_cursor(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session)
        for minute in range(1, 3):
            change = service.RecordChange("item", item.id, {"quantity": minute}, {"quantity": 9})
            service.record(
                session,
                APP_ACTOR,
                "item.quantity_changed",
                [change],
                builders.NOW + timedelta(minutes=minute),
            )
    with open_read_session(migrated_engine) as session:
        first = service.list_item_history(session, item.id, 2, None)
        second = service.list_item_history(session, item.id, 2, first.next_cursor)
    assert len(first.items) == 2
    assert [entry.id for entry in second.items] == [item.history_entry_id]
    assert second.next_cursor is None
