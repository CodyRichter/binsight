from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.features.attachments import service as attachments
from app.features.attachments.service import StoredPhoto
from app.features.history import service as history
from app.features.items.listing import count_inbox as count_inbox
from app.features.items.listing import get_items as get_items
from app.features.items.listing import list_inbox as list_inbox
from app.features.items.listing import list_items as list_items
from app.features.items.listing import searchable_items as searchable_items
from app.features.items.schemas import (
    Item as Item,
)  # re-exported: search shapes its results with it
from app.features.items.schemas import (
    ItemChanges,
    ItemCreated,
    ItemMove,
    ItemMoved,
    ItemsCreated,
    ItemUpdated,
    NewItem,
    NewItems,
)
from app.features.items.shaping import path_of, shaped
from app.models import Actor


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
    photo: StoredPhoto,
    home_location_id: str | None,
    actor: Actor,
    now: datetime,
) -> ItemCreated:
    """Add an item from a photo alone; it waits in the inbox until it is given a name."""
    path_of(session, home_location_id)
    item = _new(None, home_location_id, now)
    session.add(item)
    session.flush()
    attached = attachments.attach_photo(session, item.id, photo, now)
    changes = [
        history.RecordChange("item", item.id, None, _fields(item)),
        history.RecordChange("attachment", photo.id, None, attached),
    ]
    entry_id = history.record(session, actor, "item.created", changes, now)
    return ItemCreated(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def _get(session: Session, item_id: str) -> models.Item:
    item = session.get(models.Item, item_id)
    if item is None:
        raise AppError(404, "item_not_found", "That item does not exist.")
    return item


def get_item(session: Session, item_id: str) -> Item:
    """One item, with the full path of its home location."""
    return shaped(session, _get(session, item_id))


def update_item(
    session: Session, item_id: str, changes: ItemChanges, actor: Actor, now: datetime
) -> ItemUpdated:
    """Give an item its name, or change how many of it there are."""
    item = _get(session, item_id)
    changed = changes.model_dump(exclude_none=True)
    before = {field: getattr(item, field) for field in changed}
    for field, value in changed.items():
        setattr(item, field, value)
    item.updated_at = now
    action = "item.named" if changed.keys() == {"name"} else "item.updated"
    change = history.RecordChange("item", item.id, before, changed)
    entry_id = history.record(session, actor, action, [change], now)
    return ItemUpdated(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def move_item(
    session: Session, item_id: str, move: ItemMove, actor: Actor, now: datetime
) -> ItemMoved:
    """Move an item into another location."""
    item = _get(session, item_id)
    path_of(session, move.location_id)
    if item.home_location_id == move.location_id:
        raise AppError(409, "already_there", "That item is already there.")
    before = {"home_location_id": item.home_location_id}
    item.home_location_id = move.location_id
    item.updated_at = now
    change = history.RecordChange("item", item.id, before, {"home_location_id": move.location_id})
    entry_id = history.record(session, actor, "item.moved", [change], now)
    return ItemMoved(**shaped(session, item).model_dump(), history_entry_id=entry_id)
