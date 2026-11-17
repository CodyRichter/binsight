from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.history import service as history
from app.features.items.schemas import Item, ItemChanges, ItemCreated, ItemUpdated, NewItem
from app.features.locations import service as locations
from app.features.locations.service import PathStep
from app.models import Actor


def _item(item: models.Item, path: list[PathStep]) -> Item:
    return Item(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        home_location_id=item.home_location_id,
        path=path,
        created_at=item.created_at,
    )


def _path(session: Session, home_location_id: str | None) -> list[PathStep]:
    if home_location_id is None:
        return []
    return locations.location_path(session, home_location_id)


def create_item(session: Session, new: NewItem, actor: Actor, now: datetime) -> ItemCreated:
    """Add an item by name, in a location or in the inbox."""
    path = _path(session, new.home_location_id)
    item = models.Item(id=new_identifier(), created_at=now, updated_at=now, **new.model_dump())
    session.add(item)
    session.flush()
    after = {
        "name": item.name,
        "quantity": item.quantity,
        "home_location_id": item.home_location_id,
    }
    change = history.RecordChange("item", item.id, None, after)
    entry_id = history.record(session, actor, "item.created", [change], now)
    return ItemCreated(**_item(item, path).model_dump(), history_entry_id=entry_id)


def _get(session: Session, item_id: str) -> models.Item:
    item = session.get(models.Item, item_id)
    if item is None:
        raise AppError(404, "item_not_found", "That item does not exist.")
    return item


def get_item(session: Session, item_id: str) -> Item:
    """One item, with the full path of its home location."""
    item = _get(session, item_id)
    return _item(item, _path(session, item.home_location_id))


def update_item(
    session: Session, item_id: str, changes: ItemChanges, actor: Actor, now: datetime
) -> ItemUpdated:
    """Change how many of an item there are."""
    item = _get(session, item_id)
    before = {"quantity": item.quantity}
    item.quantity = changes.quantity
    item.updated_at = now
    change = history.RecordChange("item", item.id, before, {"quantity": item.quantity})
    entry_id = history.record(session, actor, "item.updated", [change], now)
    path = _path(session, item.home_location_id)
    return ItemUpdated(**_item(item, path).model_dump(), history_entry_id=entry_id)


def list_items(
    session: Session, location_id: str, everything_inside: bool, limit: int, cursor: str | None
) -> Page[Item]:
    """The items in a location, oldest first, and optionally those in every location beneath it."""
    within = locations.location_ids_within(session, location_id)
    homes = within if everything_inside else [location_id]
    oldest_first = (
        select(models.Item)
        .where(models.Item.home_location_id.in_(homes))
        .order_by(models.Item.created_at, models.Item.id)
        .limit(limit + 1)
    )
    if cursor is not None:
        at, identifier = decode_cursor(cursor)
        created_at, item_id = models.Item.created_at, models.Item.id
        newer = or_(created_at > at, and_(created_at == at, item_id > identifier))
        oldest_first = oldest_first.where(newer)
    rows = list(session.scalars(oldest_first))
    last = rows[limit - 1] if len(rows) > limit else None
    return Page(
        items=[_item(row, _path(session, row.home_location_id)) for row in rows[:limit]],
        next_cursor=encode_cursor(last.created_at, last.id) if last else None,
    )
