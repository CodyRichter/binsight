from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.items.schemas import InboxCount, Item, SearchableItem
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


def searchable_items(session: Session) -> list[SearchableItem]:
    """Every named item's identifier and name, for search to score."""
    query = select(models.Item.id, models.Item.name).where(
        models.Item.name.is_not(None), _not_deleted()
    )
    return [
        SearchableItem(id=item_id, name=name)
        for item_id, name in session.execute(query)
        if name is not None
    ]


def get_items(session: Session, item_ids: list[str]) -> list[Item]:
    """The items with these identifiers, in the order given, each with its path."""
    found = {
        row.id: row
        for row in session.scalars(select(models.Item).where(models.Item.id.in_(item_ids)))
    }
    return [shaped(session, found[item_id]) for item_id in item_ids]
