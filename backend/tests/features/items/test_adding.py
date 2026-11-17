import pytest
from pydantic import ValidationError
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.items import service
from app.features.items.schemas import ItemChanges, NewItems
from app.models import Actor, HistoryEntry
from tests import builders
from tests.photos import photo


def test_several_items_are_added_in_order_as_one_history_entry(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        bin_id = builders.location(session, "Cables", builders.location(session).id).id
        names = ["Ethernet cable", "Patch cable", "Cable ties"]
        added = service.create_items(
            session, NewItems(names=names, home_location_id=bin_id), Actor.app, builders.NOW
        )
    with open_read_session(migrated_engine) as session:
        listed = service.list_items(session, bin_id, False, 50, None)
        entry = session.get(HistoryEntry, added.history_entry_id)
        assert entry is not None
        assert (entry.action, len(entry.changes)) == ("items.created", 3)
    assert [item.name for item in listed.items] == names
    assert [item.quantity for item in added.items] == [1, 1, 1]


@pytest.mark.parametrize("names", [[], ["name"] * 101, ["Ethernet cable", " "]])
def test_adding_several_needs_1_to_100_names(names: list[str]) -> None:
    with pytest.raises(ValidationError):
        NewItems(names=names)


def _photo_item(settings: Settings, engine: Engine, home: str | None = None) -> str:
    with (
        attachments.saved_photo(settings, photo(), "IMG_0001.jpg") as stored,
        open_write_session(engine) as session,
    ):
        return service.create_item_by_photo(session, stored, home, Actor.app, builders.NOW).id


def test_an_item_added_by_photo_has_no_name_and_waits_in_the_inbox(
    settings: Settings, migrated_engine: Engine
) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session).id
    item_id = _photo_item(settings, migrated_engine, home)
    with open_read_session(migrated_engine) as session:
        item = service.get_item(session, item_id)
        inbox = service.list_inbox(session, 50, None)
        assert service.count_inbox(session).count == 1
    assert (item.name, item.home_location_id) == (None, home)
    assert item.photo_url is not None
    assert [listed.id for listed in inbox.items] == [item_id]


def test_naming_an_item_takes_it_out_of_the_inbox(
    settings: Settings, migrated_engine: Engine
) -> None:
    with open_write_session(migrated_engine) as session:
        home = builders.location(session).id
    item_id = _photo_item(settings, migrated_engine, home)
    with open_write_session(migrated_engine) as session:
        named = service.update_item(
            session, item_id, ItemChanges(name="Multimeter"), Actor.app, builders.NOW
        )
        entry = session.get(HistoryEntry, named.history_entry_id)
        assert entry is not None
        assert entry.action == "item.named"
        assert [(c.before, c.after) for c in entry.changes] == [
            ({"name": None}, {"name": "Multimeter"})
        ]
    with open_read_session(migrated_engine) as session:
        assert service.count_inbox(session).count == 0


def test_an_item_with_no_home_is_in_the_inbox_and_one_with_both_is_not(
    migrated_engine: Engine,
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Drill", builders.location(session).id)
        homeless = builders.item(session, "Tape measure").id
    with open_read_session(migrated_engine) as session:
        page = service.list_inbox(session, 50, None)
        assert [item.id for item in page.items] == [homeless]
        assert page.next_cursor is None


def test_the_inbox_is_listed_a_page_at_a_time(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        for name in ("Drill", "Tape", "Level"):
            builders.item(session, name)
    with open_read_session(migrated_engine) as session:
        first = service.list_inbox(session, 2, None)
        second = service.list_inbox(session, 2, first.next_cursor)
    assert len(first.items) + len(second.items) == 3
    assert second.next_cursor is None


@pytest.mark.parametrize("changes", [{}, {"name": None}, {"name": " "}])
def test_a_name_can_be_set_but_not_cleared(changes: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ItemChanges.model_validate(changes)


def test_a_photo_is_kept_with_its_item(settings: Settings, migrated_engine: Engine) -> None:
    item_id = _photo_item(settings, migrated_engine)
    with open_read_session(migrated_engine) as session:
        url = service.get_item(session, item_id).photo_url
        assert url is not None
        stored_id = url.split("/")[3]
        stored = attachments.photo_file(session, settings, stored_id)
    assert stored.exists()
    assert list(settings.attachments_directory.iterdir()) == [stored]
