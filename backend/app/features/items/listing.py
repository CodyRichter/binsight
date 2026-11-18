from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.core.pagination import Page, decode_cursor, decode_offset, encode_cursor, encode_offset
from app.features.items.schemas import Category, InboxCount, Item, SearchableItem, Tag
from app.features.items.shaping import shaped
from app.features.locations import service as locations


def _oldest_first(
    session: Session, which: ColumnElement[bool], limit: int, cursor: str | None
) -> Page[Item]:
    query = (
        select(models.Item)
        .where(which, _not_deleted())
        .order_by(models.Item.created_at, models.Item.id)
        .limit(limit + 1)
    )
    if cursor is not None:
        at, identifier = decode_cursor(cursor)
        created_at, item_id = models.Item.created_at, models.Item.id
        query = query.where(or_(created_at > at, and_(created_at == at, item_id > identifier)))
    rows = list(session.scalars(query))
    last = rows[limit - 1] if len(rows) > limit else None
    return Page(
        items=[shaped(session, row) for row in rows[:limit]],
        next_cursor=encode_cursor(last.created_at, last.id) if last else None,
    )


def list_items(
    session: Session, location_id: str, everything_inside: bool, limit: int, cursor: str | None
) -> Page[Item]:
    """The items in a location, oldest first, and optionally those in every location beneath it."""
    within = locations.location_ids_within(session, location_id)
    homes = within if everything_inside else [location_id]
    return _oldest_first(session, models.Item.home_location_id.in_(homes), limit, cursor)


def _not_deleted() -> ColumnElement[bool]:
    return models.Item.deleted_at.is_(None)


def _in_inbox() -> ColumnElement[bool]:
    return or_(models.Item.name.is_(None), models.Item.home_location_id.is_(None))


def list_inbox(session: Session, limit: int, cursor: str | None) -> Page[Item]:
    """The items still missing a name or a home location, oldest first."""
    return _oldest_first(session, _in_inbox(), limit, cursor)


def count_inbox(session: Session) -> InboxCount:
    """How many items are missing a name or a home location."""
    query = select(func.count()).select_from(models.Item).where(_in_inbox(), _not_deleted())
    count = session.scalar(query)
    return InboxCount(count=count or 0)


def _details(item: models.Item) -> str:
    details = [item.brand, item.model, item.serial_number, item.notes, *item.tags]
    return " ".join(detail for detail in details if detail)


def searchable_items(session: Session) -> list[SearchableItem]:
    """Every named item's identifier, name, details and tags, for search to score."""
    query = (
        select(models.Item)
        .where(models.Item.name.is_not(None), _not_deleted())
        .options(selectinload(models.Item.tag_rows))
    )
    return [
        SearchableItem(id=item.id, name=item.name, details=_details(item))
        for item in session.scalars(query)
        if item.name is not None
    ]


def _counted_page[T](rows: list[T], start: int, limit: int) -> Page[T]:
    end = start + limit
    return Page(items=rows[start:end], next_cursor=encode_offset(end) if end < len(rows) else None)


def list_categories(session: Session, limit: int, cursor: str | None) -> Page[Category]:
    """The categories items have, by name, each with how many items have it."""
    count = func.count(models.Item.id)
    query = (
        select(models.Category.name, count)
        .join(models.Item, models.Item.category_id == models.Category.id)
        .where(_not_deleted())
        .group_by(models.Category.id)
        .order_by(func.lower(models.Category.name))
    )
    rows = [Category(name=name, item_count=total) for name, total in session.execute(query)]
    return _counted_page(rows, decode_offset(cursor) if cursor else 0, limit)


def list_tags(session: Session, limit: int, cursor: str | None) -> Page[Tag]:
    """The tags items have, by name, each with how many items have it."""
    count = func.count(models.Item.id)
    query = (
        select(models.ItemTag.tag, count)
        .join(models.Item, models.Item.id == models.ItemTag.item_id)
        .where(_not_deleted())
        .group_by(models.ItemTag.tag)
        .order_by(models.ItemTag.tag)
    )
    rows = [Tag(name=name, item_count=total) for name, total in session.execute(query)]
    return _counted_page(rows, decode_offset(cursor) if cursor else 0, limit)


def get_items(session: Session, item_ids: list[str]) -> list[Item]:
    """The items with these identifiers, in the order given, each with its path."""
    found = {
        row.id: row
        for row in session.scalars(select(models.Item).where(models.Item.id.in_(item_ids)))
    }
    return [shaped(session, found[item_id]) for item_id in item_ids]
