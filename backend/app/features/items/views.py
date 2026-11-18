from datetime import datetime, timedelta
from typing import Any, Literal

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app import models
from app.core.pagination import Page, counted_page, decode_offset, encode_offset
from app.features.items.listing import SOON
from app.features.items.schemas import Item
from app.features.items.shaping import shaped

ItemView = Literal[
    "lent-out",
    "missing",
    "warranty-ending",
    "return-closing",
    "recently-added",
    "possible-duplicates",
    "archive",
]

RECENT = timedelta(days=30)

type Order = list[ColumnElement[Any]]


def _live() -> ColumnElement[bool]:
    return models.Item.deleted_at.is_(None)


def _current() -> ColumnElement[bool]:
    return models.Item.status.not_in(models.ARCHIVED)


def _same_name() -> ColumnElement[str]:
    return func.lower(func.trim(models.Item.name))


def _duplicated() -> ColumnElement[bool]:
    shared = (
        select(_same_name())
        .where(models.Item.name.is_not(None), _live(), _current())
        .group_by(_same_name())
        .having(func.count() > 1)
    )
    return _same_name().in_(shared)


def _view(view: ItemView, now: datetime) -> tuple[list[ColumnElement[bool]], Order]:
    item, today = models.Item, now.date()
    soon = (today, today + SOON)
    newest = item.created_at.desc()
    views: dict[ItemView, tuple[list[ColumnElement[bool]], Order]] = {
        "lent-out": ([item.status == models.ItemStatus.lent_out], [item.lent_at.desc()]),
        "missing": ([item.status == models.ItemStatus.missing], [item.updated_at.desc()]),
        "warranty-ending": ([item.warranty_ends.between(*soon)], [item.warranty_ends.asc()]),
        "return-closing": ([item.return_ends.between(*soon)], [item.return_ends.asc()]),
        "recently-added": ([item.created_at >= now - RECENT], [newest]),
        "possible-duplicates": ([_duplicated()], [_same_name(), item.created_at.asc()]),
        "archive": ([item.status.in_(models.ARCHIVED)], [item.retired_at.desc()]),
    }
    which, order = views[view]
    # The archive is the one view of items that have left the home's contents.
    kept = [_live(), *which] if view == "archive" else [_live(), _current(), *which]
    return kept, [*order, item.id.asc()]


def list_view_items(
    session: Session, view: ItemView, now: datetime, limit: int, cursor: str | None
) -> Page[Item]:
    """The items one built-in view lists, in that view's order, with their paths."""
    which, order = _view(view, now)
    start = decode_offset(cursor) if cursor else 0
    query = select(models.Item).where(*which).order_by(*order).offset(start).limit(limit + 1)
    rows = list(session.scalars(query))
    more = len(rows) > limit
    return Page(
        items=[shaped(session, row) for row in rows[:limit]],
        next_cursor=encode_offset(start + limit) if more else None,
    )


def count_view_items(session: Session, view: ItemView, now: datetime) -> int:
    """How many items one built-in view lists."""
    which, _ = _view(view, now)
    return session.scalar(select(func.count()).select_from(models.Item).where(*which)) or 0


def _kept(session: Session, item_ids: list[str]) -> list[models.Item]:
    query = select(models.Item).where(models.Item.id.in_(item_ids), _live(), _current())
    found = {row.id: row for row in session.scalars(query)}
    return [found[item_id] for item_id in item_ids if item_id in found]


def list_items_in_order(
    session: Session, item_ids: list[str], limit: int, cursor: str | None
) -> Page[Item]:
    """These items in the order given, leaving out deleted and archived ones."""
    rows = counted_page(_kept(session, item_ids), decode_offset(cursor) if cursor else 0, limit)
    return Page(items=[shaped(session, row) for row in rows.items], next_cursor=rows.next_cursor)


def count_items_in_order(session: Session, item_ids: list[str]) -> int:
    """How many of these items are neither deleted nor archived."""
    return len(_kept(session, item_ids))
