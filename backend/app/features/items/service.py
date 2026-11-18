from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.features.attachments import service as attachments
from app.features.attachments.service import StoredFile
from app.features.history import service as history
from app.features.items.attachments import add_item_photo as add_item_photo
from app.features.items.attachments import attach_file as attach_file
from app.features.items.attachments import attach_web_link as attach_web_link
from app.features.items.attachments import list_item_attachments as list_item_attachments
from app.features.items.attachments import (
    preview_remove_item_attachment as preview_remove_item_attachment,
)
from app.features.items.attachments import remove_item_attachment as remove_item_attachment
from app.features.items.details import apply_changes
from app.features.items.links import link_items as link_items
from app.features.items.links import list_item_links as list_item_links
from app.features.items.links import unlink_items as unlink_items
from app.features.items.listing import count_inbox as count_inbox
from app.features.items.listing import get_items as get_items
from app.features.items.listing import list_categories as list_categories
from app.features.items.listing import list_inbox as list_inbox
from app.features.items.listing import list_items as list_items
from app.features.items.listing import list_tags as list_tags
from app.features.items.listing import searchable_items as searchable_items
from app.features.items.records import item_record, live_item
from app.features.items.schemas import (
    Item as Item,
)  # re-exported: search shapes its results with it
from app.features.items.schemas import (
    ItemChanges,
    ItemCreated,
    ItemDeleted,
    ItemMove,
    ItemMoved,
    ItemRestored,
    ItemsCreated,
    ItemUpdated,
    NewItem,
    NewItems,
)
from app.features.items.schemas import (
    ItemFilters as ItemFilters,
)  # re-exported: search filters with it
from app.features.items.shaping import path_of, shaped
from app.features.items.statuses import change_item_status as change_item_status
from app.features.items.statuses import items_to_mark_missing as items_to_mark_missing
from app.features.items.statuses import lend_item as lend_item
from app.features.items.statuses import list_lent_to_names as list_lent_to_names
from app.features.items.statuses import mark_item_found as mark_item_found
from app.features.items.statuses import mark_item_missing as mark_item_missing
from app.features.items.statuses import mark_items_missing as mark_items_missing
from app.features.items.statuses import return_item as return_item
from app.features.items.views import ItemView as ItemView
from app.features.items.views import count_items_in_order as count_items_in_order
from app.features.items.views import count_view_items as count_view_items
from app.features.items.views import list_items_in_order as list_items_in_order
from app.features.items.views import list_view_items as list_view_items
from app.models import Actor, AttachmentKind


def _fields(item: models.Item) -> dict[str, Any]:
    return {"name": item.name, "quantity": item.quantity, "home_location_id": item.home_location_id}


def _new(name: str | None, home_location_id: str | None, now: datetime) -> models.Item:
    return models.Item(
        id=new_identifier(),
        name=name,
        quantity=1,
        home_location_id=home_location_id,
        created_at=now,
        updated_at=now,
    )


def create_item(session: Session, new: NewItem, actor: Actor, now: datetime) -> ItemCreated:
    """Add an item by name, in a location or in the inbox."""
    path_of(session, new.home_location_id)
    item = _new(new.name, new.home_location_id, now)
    session.add(item)
    session.flush()
    change = history.RecordChange("item", item.id, None, _fields(item))
    entry_id = history.record(session, actor, "item.created", [change], now)
    return ItemCreated(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def create_items(session: Session, new: NewItems, actor: Actor, now: datetime) -> ItemsCreated:
    """Add several items by name at once, in the order given, as one change to undo."""
    path_of(session, new.home_location_id)
    # A microsecond apart, so the list shows them in the order they were typed.
    added = [
        _new(name, new.home_location_id, now + timedelta(microseconds=order))
        for order, name in enumerate(new.names)
    ]
    session.add_all(added)
    session.flush()
    changes = [history.RecordChange("item", item.id, None, _fields(item)) for item in added]
    entry_id = history.record(session, actor, "items.created", changes, now)
    return ItemsCreated(items=[shaped(session, item) for item in added], history_entry_id=entry_id)


def create_item_by_photo(
    session: Session,
    photo: StoredFile,
    home_location_id: str | None,
    actor: Actor,
    now: datetime,
) -> ItemCreated:
    """Add an item from a photo alone; it waits in the inbox until it is given a name."""
    path_of(session, home_location_id)
    item = _new(None, home_location_id, now)
    session.add(item)
    session.flush()
    attached = attachments.attach_to_item(session, item.id, photo, AttachmentKind.photo, now)
    changes = [
        history.RecordChange("item", item.id, None, _fields(item)),
        history.RecordChange("attachment", photo.id, None, attached),
    ]
    entry_id = history.record(session, actor, "item.created", changes, now)
    return ItemCreated(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def get_item(session: Session, item_id: str) -> Item:
    """One item, with the full path of its home location, even when it has been deleted."""
    return shaped(session, item_record(session, item_id))


def update_item(
    session: Session, item_id: str, changes: ItemChanges, actor: Actor, now: datetime
) -> ItemUpdated:
    """Change an item's name, quantity, category, tags or details, as one change to undo."""
    item = live_item(session, item_id)
    action, change = apply_changes(session, item, changes, now)
    entry_id = history.record(session, actor, action, [change], now)
    return ItemUpdated(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def move_item(
    session: Session, item_id: str, move: ItemMove, actor: Actor, now: datetime
) -> ItemMoved:
    """Move an item into another location."""
    item = live_item(session, item_id)
    path_of(session, move.location_id)
    if item.home_location_id == move.location_id:
        raise AppError(409, "already_there", "That item is already there.")
    before = {"home_location_id": item.home_location_id}
    item.home_location_id = move.location_id
    item.updated_at = now
    change = history.RecordChange("item", item.id, before, {"home_location_id": move.location_id})
    entry_id = history.record(session, actor, "item.moved", [change], now)
    return ItemMoved(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def preview_delete_item(session: Session, item_id: str) -> Item:
    """The item that deleting would take out of view, refused as deleting it would be."""
    return shaped(session, live_item(session, item_id))


def _set_deleted_at(
    session: Session, item: models.Item, deleted_at: datetime | None, actor: Actor, now: datetime
) -> str:
    before = {"deleted_at": item.deleted_at.isoformat() if item.deleted_at else None}
    item.deleted_at = deleted_at
    item.updated_at = now
    after = {"deleted_at": deleted_at.isoformat() if deleted_at else None}
    change = history.RecordChange("item", item.id, before, after)
    action = "item.deleted" if deleted_at else "item.restored"
    return history.record(session, actor, action, [change], now)


def delete_item(session: Session, item_id: str, actor: Actor, now: datetime) -> ItemDeleted:
    """Take an item out of view; it can be restored."""
    item = live_item(session, item_id)
    entry_id = _set_deleted_at(session, item, now, actor, now)
    return ItemDeleted(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def restore_item(session: Session, item_id: str, actor: Actor, now: datetime) -> ItemRestored:
    """Bring a deleted item back where it was."""
    item = item_record(session, item_id)
    if item.deleted_at is None:
        raise AppError(409, "not_deleted", "That item has not been deleted.")
    entry_id = _set_deleted_at(session, item, None, actor, now)
    return ItemRestored(**shaped(session, item).model_dump(), history_entry_id=entry_id)
