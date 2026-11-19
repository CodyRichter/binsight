from datetime import datetime
from enum import StrEnum

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.pagination import Page, counted_page, decode_offset
from app.features.history import service as history
from app.features.items.bulk import changing_items, recorded
from app.features.items.bulk_schemas import ItemsChanged, ItemsStatus
from app.features.items.records import live_item
from app.features.items.schemas import (
    Item,
    ItemFound,
    ItemLending,
    ItemLent,
    ItemMarkedFound,
    ItemMarkedMissing,
    ItemReturned,
    ItemStatusChange,
    ItemStatusChanged,
    LentToName,
)
from app.features.items.shaping import refuse_deleted_home, shaped
from app.models import ARCHIVED, Actor, ItemStatus


def _recorded(value: object) -> object:
    if isinstance(value, StrEnum):
        return value.value
    return value.isoformat() if isinstance(value, datetime) else value


def _retired_at(item: models.Item, status: ItemStatus, now: datetime) -> datetime | None:
    if status not in ARCHIVED:
        return None
    return item.retired_at if item.status in ARCHIVED else now


def _status_change(
    item: models.Item, status: ItemStatus, now: datetime, lent_to: str | None = None
) -> history.RecordChange:
    # The lent fields belong to lent_out and retired_at to the archive, so each follows status.
    wanted = {
        "status": status,
        "lent_to": lent_to,
        "lent_at": now if status == ItemStatus.lent_out else None,
        "retired_at": _retired_at(item, status, now),
    }
    before: dict[str, object] = {}
    after: dict[str, object] = {}
    for field, value in wanted.items():
        # Who it was lent to is always recorded, so history can offer the name again.
        if getattr(item, field) != value or (field == "lent_to" and value is not None):
            before[field] = _recorded(getattr(item, field))
            after[field] = _recorded(value)
            setattr(item, field, value)
    item.updated_at = now
    return history.RecordChange("item", item.id, before, after)


def _not_archived(item: models.Item) -> models.Item:
    if item.status in ARCHIVED:
        raise AppError(409, "item_archived", "That item is in the archive. Put it back first.")
    return item


def change_item_status(
    session: Session, item_id: str, change: ItemStatusChange, actor: Actor, now: datetime
) -> ItemStatusChanged:
    """Mark an item in use, back in place, or sold, given away or thrown away (the archive)."""
    item = live_item(session, item_id)
    status = ItemStatus(change.status)
    if item.status == status:
        raise AppError(409, "status_unchanged", "That item already has that status.")
    if item.status == ItemStatus.missing and status == ItemStatus.in_place:
        raise AppError(409, "use_mark_found", "Mark a missing item found, saying where it is.")
    recorded = _status_change(item, status, now)
    entry_id = history.record(session, actor, "item.status_changed", [recorded], now)
    return ItemStatusChanged(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def _restatusing(session: Session, change: ItemsStatus) -> list[models.Item]:
    status = ItemStatus(change.status)
    items = changing_items(
        session,
        change.item_ids,
        lambda item: item.status != status,
        AppError(409, "status_unchanged", "Those items already have that status."),
    )
    if status == ItemStatus.in_place and any(i.status == ItemStatus.missing for i in items):
        raise AppError(409, "use_mark_found", "Mark a missing item found, saying where it is.")
    return items


def preview_change_items_status(session: Session, change: ItemsStatus) -> list[Item]:
    """The items whose status would change, refused as changing it would be."""
    return [shaped(session, item) for item in _restatusing(session, change)]


def change_items_status(
    session: Session, change: ItemsStatus, actor: Actor, now: datetime
) -> ItemsChanged:
    """Give many items one status, as one change to undo; lending and missing have their own."""
    status = ItemStatus(change.status)
    changes = [(item, _status_change(item, status, now)) for item in _restatusing(session, change)]
    return recorded(session, "item.status_changed", changes, actor, now)


def lend_item(
    session: Session, item_id: str, lending: ItemLending, actor: Actor, now: datetime
) -> ItemLent:
    """Lend an item to someone, by name. It keeps its home location to come back to."""
    item = _not_archived(live_item(session, item_id))
    recorded = _status_change(item, ItemStatus.lent_out, now, lending.lent_to)
    entry_id = history.record(session, actor, "item.lent", [recorded], now)
    return ItemLent(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def return_item(session: Session, item_id: str, actor: Actor, now: datetime) -> ItemReturned:
    """Mark a lent-out item returned: it is back in place and no longer lent to anyone."""
    item = live_item(session, item_id)
    if item.status != ItemStatus.lent_out:
        raise AppError(409, "not_lent", "That item isn't lent out.")
    recorded = _status_change(item, ItemStatus.in_place, now)
    entry_id = history.record(session, actor, "item.returned", [recorded], now)
    return ItemReturned(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def _markable_item(session: Session, item_id: str) -> models.Item:
    item = _not_archived(live_item(session, item_id))
    if item.status == ItemStatus.missing:
        raise AppError(409, "already_missing", "That item is already marked missing.")
    return item


def mark_item_missing(
    session: Session, item_id: str, actor: Actor, now: datetime
) -> ItemMarkedMissing:
    """Mark an item missing: it isn't where it should be. It keeps its home location."""
    item = _markable_item(session, item_id)
    recorded = _status_change(item, ItemStatus.missing, now)
    entry_id = history.record(session, actor, "item.marked_missing", [recorded], now)
    return ItemMarkedMissing(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def _markable(session: Session, location_id: str, item_ids: list[str]) -> list[models.Item]:
    items = [_markable_item(session, item_id) for item_id in item_ids]
    if any(item.home_location_id != location_id for item in items):
        raise AppError(
            422, "not_in_location", "Only items directly in that location can be marked missing."
        )
    return items


def items_to_mark_missing(session: Session, location_id: str, item_ids: list[str]) -> list[Item]:
    """The items a check would mark missing, refused as marking them would be."""
    return [shaped(session, item) for item in _markable(session, location_id, item_ids)]


def mark_items_missing(
    session: Session, location_id: str, item_ids: list[str], now: datetime
) -> list[history.RecordChange]:
    """Mark items in a location missing, for a change that records its own history entry."""
    items = _markable(session, location_id, item_ids)
    return [_status_change(item, ItemStatus.missing, now) for item in items]


def mark_item_found(
    session: Session, item_id: str, found: ItemFound, actor: Actor, now: datetime
) -> ItemMarkedFound:
    """Mark a missing item found, where it is now, which may be its old home."""
    item = live_item(session, item_id)
    if item.status != ItemStatus.missing:
        raise AppError(409, "not_missing", "That item isn't marked missing.")
    refuse_deleted_home(session, found.location_id)
    before = {"status": item.status.value, "home_location_id": item.home_location_id}
    item.status = ItemStatus.in_place
    item.home_location_id = found.location_id
    item.updated_at = now
    after = {"status": ItemStatus.in_place.value, "home_location_id": found.location_id}
    change = history.RecordChange("item", item.id, before, after)
    entry_id = history.record(session, actor, "item.found", [change], now)
    return ItemMarkedFound(**shaped(session, item).model_dump(), history_entry_id=entry_id)


def list_lent_to_names(session: Session, limit: int, cursor: str | None) -> Page[LentToName]:
    """The names items have been lent to before, most recent first, to lend to again."""
    names = [LentToName(name=name) for name in history.lent_to_names(session)]
    return counted_page(names, decode_offset(cursor) if cursor else 0, limit)
