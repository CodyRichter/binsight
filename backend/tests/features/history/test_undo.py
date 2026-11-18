import pytest
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.history import service
from app.features.items import service as items
from app.features.items.schemas import ItemChanges, NewItems
from app.features.labels import service as labels
from app.features.labels.schemas import NewBlankLabels
from app.models import Actor, HistoryEntry, Item
from tests import builders
from tests.photos import photo


def _undo(engine: Engine, settings: Settings, entry_id: str) -> str:
    with open_write_session(engine) as session:
        return service.undo(session, settings, entry_id, Actor.app, builders.NOW).history_entry_id


def _refusal(engine: Engine, settings: Settings, entry_id: str) -> tuple[int, str]:
    with pytest.raises(AppError) as refused:
        _undo(engine, settings, entry_id)
    return refused.value.status, refused.value.code


def test_undoing_an_add_removes_the_item(migrated_engine: Engine, settings: Settings) -> None:
    with open_write_session(migrated_engine) as session:
        added = builders.item(session, "Ethernet cable")
    undo_id = _undo(migrated_engine, settings, added.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert session.get(Item, added.id) is None
        original = session.get(HistoryEntry, added.history_entry_id)
        undo = session.get(HistoryEntry, undo_id)
        assert original is not None
        assert undo is not None
        assert original.undone_by == undo_id
        assert undo.action == "history.undone"
        assert [(c.record_id, c.after) for c in undo.changes] == [(added.id, {})]


def test_undoing_several_added_at_once_removes_them_all(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        added = items.create_items(
            session, NewItems(names=["Tape", "Glue", "Pins"]), Actor.app, builders.NOW
        )
    _undo(migrated_engine, settings, added.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert items.count_inbox(session).count == 0


def test_undoing_a_photo_add_removes_the_item_and_its_file(
    migrated_engine: Engine, settings: Settings
) -> None:
    with (
        attachments.saved_photo(settings, photo(), None) as stored,
        open_write_session(migrated_engine) as session,
    ):
        added = items.create_item_by_photo(session, stored, None, Actor.app, builders.NOW)
    _undo(migrated_engine, settings, added.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert session.get(Item, added.id) is None
    assert not (settings.data_directory / stored.path).exists()


def test_a_photo_stays_when_its_undo_is_rolled_back(
    migrated_engine: Engine, settings: Settings
) -> None:
    with (
        attachments.saved_photo(settings, photo(), None) as stored,
        open_write_session(migrated_engine) as session,
    ):
        added = items.create_item_by_photo(session, stored, None, Actor.app, builders.NOW)

    def undo_then_fail() -> None:
        with open_write_session(migrated_engine) as session:
            service.undo(session, settings, added.history_entry_id, Actor.app, builders.NOW)
            raise RuntimeError

    with pytest.raises(RuntimeError):
        undo_then_fail()
    assert (settings.data_directory / stored.path).exists()


def test_undoing_a_quantity_change_puts_the_old_quantity_back(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session, "HDMI cable")
        changed = items.update_item(
            session, item.id, ItemChanges(quantity=4), Actor.app, builders.NOW
        )
    _undo(migrated_engine, settings, changed.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, item.id).quantity == 1


def test_a_change_that_was_changed_again_since_is_not_undone(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session, "HDMI cable")
        items.update_item(session, item.id, ItemChanges(quantity=4), Actor.app, builders.NOW)
    assert _refusal(migrated_engine, settings, item.history_entry_id) == (409, "changed_since")
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, item.id).quantity == 4


def test_a_change_is_undone_only_once(migrated_engine: Engine, settings: Settings) -> None:
    with open_write_session(migrated_engine) as session:
        item = builders.item(session, "HDMI cable")
        changed = items.update_item(
            session, item.id, ItemChanges(quantity=4), Actor.app, builders.NOW
        )
    _undo(migrated_engine, settings, changed.history_entry_id)
    refusal = _refusal(migrated_engine, settings, changed.history_entry_id)
    assert refusal == (409, "already_undone")


def test_a_change_undo_does_not_cover_is_refused(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        made = labels.create_blank_labels(session, NewBlankLabels(count=1), Actor.app, builders.NOW)
    refusal = _refusal(migrated_engine, settings, made.history_entry_id)
    assert refusal == (409, "undo_not_supported")


def test_an_unknown_change_is_not_found(migrated_engine: Engine, settings: Settings) -> None:
    assert _refusal(migrated_engine, settings, "made-up") == (404, "history_entry_not_found")


def test_undoing_a_delete_restores_the_item(migrated_engine: Engine, settings: Settings) -> None:
    with open_write_session(migrated_engine) as session:
        added = builders.item(session, "Ethernet cable")
        deleted = items.delete_item(session, added.id, Actor.app, builders.NOW)
    _undo(migrated_engine, settings, deleted.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, added.id).deleted_at is None
        assert items.count_inbox(session).count == 1


def test_undoing_a_restore_deletes_the_item_again(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        added = builders.item(session, "Ethernet cable")
        items.delete_item(session, added.id, Actor.app, builders.NOW)
        restored = items.restore_item(session, added.id, Actor.app, builders.NOW)
    _undo(migrated_engine, settings, restored.history_entry_id)
    with open_read_session(migrated_engine) as session:
        assert items.get_item(session, added.id).deleted_at == builders.NOW


def test_an_add_cannot_be_undone_once_the_item_is_deleted(
    migrated_engine: Engine, settings: Settings
) -> None:
    with open_write_session(migrated_engine) as session:
        added = builders.item(session, "Ethernet cable")
        items.delete_item(session, added.id, Actor.app, builders.NOW)
    assert _refusal(migrated_engine, settings, added.history_entry_id) == (409, "changed_since")
