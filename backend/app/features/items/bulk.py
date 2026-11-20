from collections.abc import Callable
from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.features.history import service as history
from app.features.items.bulk_schemas import (
    ItemsCategory,
    ItemsChanged,
    ItemsDelete,
    ItemsMove,
    ItemsTag,
)
from app.features.items.categories import category_name
from app.features.items.details import apply_changes
from app.features.items.own_items import leaving
from app.features.items.records import live_item
from app.features.items.schemas import Item, ItemChanges
from app.features.items.shaping import refuse_deleted_home, shaped
from app.models import Actor


def changing_items(
    session: Session,
    item_ids: list[str],
    needs_change: Callable[[models.Item], bool],
    unchanged: AppError,
) -> list[models.Item]:
    """The items a bulk edit would change, refusing the whole batch if any is gone."""
    items = [live_item(session, item_id) for item_id in item_ids]
    changing = [item for item in items if needs_change(item)]
    if not changing:
        raise unchanged
    return changing


def recorded(
    session: Session,
    action: str,
    changes: list[tuple[models.Item, history.RecordChange]],
    actor: Actor,
    now: datetime,
) -> ItemsChanged:
    """Record a bulk edit as one history entry, so one undo reverses the batch."""
    entry_id = history.record(session, actor, action, [change for _, change in changes], now)
    return ItemsChanged(
        items=[shaped(session, item) for item, _ in changes], history_entry_id=entry_id
    )


def _moving(session: Session, move: ItemsMove) -> list[models.Item]:
    refuse_deleted_home(session, move.location_id)
    return changing_items(
        session,
        move.item_ids,
        lambda item: item.home_location_id != move.location_id,
        AppError(409, "already_there", "Those items are already there."),
    )


def preview_move_items(session: Session, move: ItemsMove) -> list[Item]:
    """The items moving would move, refused as moving them would be."""
    return [shaped(session, item) for item in _moving(session, move)]


def move_items(session: Session, move: ItemsMove, actor: Actor, now: datetime) -> ItemsChanged:
    """Move many items into one location, as one change to undo."""
    changes = []
    for item in _moving(session, move):
        released_before, released_after = leaving(item, move.location_id)
        before = {"home_location_id": item.home_location_id, **released_before}
        item.home_location_id = move.location_id
        item.updated_at = now
        after = {"home_location_id": move.location_id, **released_after}
        changes.append((item, history.RecordChange("item", item.id, before, after)))
    return recorded(session, "item.moved", changes, actor, now)


def _tagging(session: Session, tagging: ItemsTag) -> list[models.Item]:
    return changing_items(
        session,
        tagging.item_ids,
        lambda item: tagging.tag not in item.tags,
        AppError(409, "already_tagged", "Those items already have that tag."),
    )


def preview_tag_items(session: Session, tagging: ItemsTag) -> list[Item]:
    """The items tagging would add the tag to, refused as tagging them would be."""
    return [shaped(session, item) for item in _tagging(session, tagging)]


def tag_items(session: Session, tagging: ItemsTag, actor: Actor, now: datetime) -> ItemsChanged:
    """Add one tag to many items, as one change to undo; their other tags stay."""
    changes = []
    for item in _tagging(session, tagging):
        tags = ItemChanges(tags=[*item.tags, tagging.tag])
        changes.append((item, apply_changes(session, item, tags, now)[1]))
    return recorded(session, "item.updated", changes, actor, now)


def _lowered(name: str | None) -> str | None:
    return name.lower() if name else None


def _recategorizing(session: Session, categorizing: ItemsCategory) -> list[models.Item]:
    wanted = _lowered(categorizing.category)
    return changing_items(
        session,
        categorizing.item_ids,
        lambda item: _lowered(category_name(session, item.category_id)) != wanted,
        AppError(409, "category_unchanged", "Those items already have that category."),
    )


def preview_change_items_category(session: Session, categorizing: ItemsCategory) -> list[Item]:
    """The items whose category would change, refused as changing it would be."""
    return [shaped(session, item) for item in _recategorizing(session, categorizing)]


def change_items_category(
    session: Session, categorizing: ItemsCategory, actor: Actor, now: datetime
) -> ItemsChanged:
    """Give many items one category, or take theirs away, as one change to undo."""
    category = ItemChanges(category=categorizing.category)
    changes = [
        (item, apply_changes(session, item, category, now)[1])
        for item in _recategorizing(session, categorizing)
    ]
    return recorded(session, "item.updated", changes, actor, now)


def preview_delete_items(session: Session, deleting: ItemsDelete) -> list[Item]:
    """The items deleting would take out of view, refused as deleting them would be."""
    return [shaped(session, live_item(session, item_id)) for item_id in deleting.item_ids]


def delete_items(
    session: Session, deleting: ItemsDelete, actor: Actor, now: datetime
) -> ItemsChanged:
    """Take many items out of view, as one change to undo; they can be restored."""
    changes = []
    for item_id in deleting.item_ids:
        item = live_item(session, item_id)
        released_before, released_after = leaving(item, None)
        item.deleted_at = now
        item.updated_at = now
        before = {"deleted_at": None, **released_before}
        after = {"deleted_at": now.isoformat(), **released_after}
        changes.append((item, history.RecordChange("item", item.id, before, after)))
    return recorded(session, "item.deleted", changes, actor, now)
