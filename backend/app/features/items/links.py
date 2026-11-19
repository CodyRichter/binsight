from datetime import datetime
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, counted_page, decode_offset
from app.features.history import service as history
from app.features.items.records import item_record, live_item
from app.features.items.schemas import ItemLinked, ItemLinkNew, ItemUnlinked, LinkedItem
from app.features.items.shaping import shaped
from app.models import Actor, LinkKind


def _ends(item_id: str, other_item_id: str, kind: LinkKind) -> tuple[str, str]:
    # Belongs with means the same either way round, so one order is kept.
    if kind == LinkKind.belongs_with:
        first, second = sorted((item_id, other_item_id))
        return first, second
    return item_id, other_item_id


def _wholes_above(session: Session, item_id: str) -> set[str]:
    above: set[str] = set()
    reached = {item_id}
    while reached:
        query = select(models.ItemLink.other_item_id).where(
            models.ItemLink.item_id.in_(reached), models.ItemLink.kind == LinkKind.part_of
        )
        reached = set(session.scalars(query)) - above
        above |= reached
    return above


def _refuse(session: Session, item_id: str, link: ItemLinkNew) -> None:
    if item_id == link.other_item_id:
        raise AppError(422, "same_item", "An item can't be linked to itself.")
    item_id, other_item_id = _ends(item_id, link.other_item_id, link.kind)
    existing = select(models.ItemLink.id).where(
        models.ItemLink.item_id == item_id,
        models.ItemLink.other_item_id == other_item_id,
        models.ItemLink.kind == link.kind,
    )
    if session.scalar(existing) is not None:
        raise AppError(409, "already_linked", "Those items are already linked that way.")
    if link.kind == LinkKind.part_of and item_id in _wholes_above(session, other_item_id):
        raise AppError(422, "part_cycle", "That would make an item part of one of its own parts.")


def link_items(
    session: Session, item_id: str, link: ItemLinkNew, actor: Actor, now: datetime
) -> ItemLinked:
    """Link two items: this one belongs with the other, or is part of it."""
    live_item(session, item_id)
    live_item(session, link.other_item_id)
    _refuse(session, item_id, link)
    first, second = _ends(item_id, link.other_item_id, link.kind)
    row = models.ItemLink(
        id=new_identifier(),
        item_id=first,
        other_item_id=second,
        kind=link.kind,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.flush()
    fields = {"item_id": first, "other_item_id": second, "kind": link.kind.value}
    change = history.RecordChange("link", row.id, None, fields)
    entry_id = history.record(session, actor, "item.linked", [change], now)
    return ItemLinked(link_id=row.id, history_entry_id=entry_id)


def unlink_items(session: Session, link_id: str, actor: Actor, now: datetime) -> ItemUnlinked:
    """Remove a link between two items; the items themselves are unchanged."""
    row = session.get(models.ItemLink, link_id)
    if row is None:
        raise AppError(404, "link_not_found", "Those items aren't linked.")
    fields = {"item_id": row.item_id, "other_item_id": row.other_item_id, "kind": row.kind.value}
    session.delete(row)
    # A removed record has nothing after, as a created one has nothing before.
    change = history.RecordChange("link", link_id, fields, {})
    entry_id = history.record(session, actor, "item.unlinked", [change], now)
    return ItemUnlinked(history_entry_id=entry_id)


def _fields(row: models.ItemLink) -> dict[str, str]:
    return {"item_id": row.item_id, "other_item_id": row.other_item_id, "kind": row.kind.value}


def _repointed(session: Session, row: models.ItemLink, item_id: str, to_item_id: str) -> bool:
    """Points a link at to_item_id in item_id's place, unless that would make a wrong link."""
    swap = {item_id: to_item_id}
    part, whole = swap.get(row.item_id, row.item_id), swap.get(row.other_item_id, row.other_item_id)
    if part == whole or _refused_ends(session, part, whole, row.kind):
        return False
    row.item_id, row.other_item_id = _ends(part, whole, row.kind)
    return True


def _refused_ends(session: Session, part: str, whole: str, kind: LinkKind) -> bool:
    first, second = _ends(part, whole, kind)
    same = select(models.ItemLink.id).filter_by(item_id=first, other_item_id=second, kind=kind)
    cycle = kind == LinkKind.part_of and part in _wholes_above(session, whole)
    return session.scalar(same) is not None or cycle


def move_links(session: Session, item_id: str, to_item_id: str) -> list[history.RecordChange]:
    """Give one item's links to another, removing any that would repeat one or link it to itself."""
    query = select(models.ItemLink).where(
        or_(models.ItemLink.item_id == item_id, models.ItemLink.other_item_id == item_id)
    )
    changes = []
    for row in list(session.scalars(query)):
        before = _fields(row)
        if _repointed(session, row, item_id, to_item_id):
            session.flush()
            changes.append(history.RecordChange("link", row.id, before, _fields(row)))
        else:
            session.delete(row)
            session.flush()
            changes.append(history.RecordChange("link", row.id, before, {}))
    return changes


type LinkSide = Literal["belongs_with", "part_of", "part"]
SIDE_ORDER: dict[LinkSide, int] = {"belongs_with": 0, "part_of": 1, "part": 2}


def _side(row: models.ItemLink, item_id: str) -> LinkSide:
    if row.kind == LinkKind.belongs_with:
        return "belongs_with"
    return "part_of" if row.item_id == item_id else "part"


def list_item_links(
    session: Session, item_id: str, limit: int, cursor: str | None
) -> Page[LinkedItem]:
    """The items linked to this one: what it belongs with, what it is part of, and its parts."""
    item_record(session, item_id)
    query = select(models.ItemLink).where(
        or_(models.ItemLink.item_id == item_id, models.ItemLink.other_item_id == item_id)
    )
    linked: list[LinkedItem] = []
    for row in session.scalars(query):
        other_id = row.other_item_id if row.item_id == item_id else row.item_id
        other = session.get(models.Item, other_id)
        # Deleting leaves links in place; a deleted item just isn't shown.
        if other is not None and other.deleted_at is None:
            linked.append(
                LinkedItem(link_id=row.id, kind=_side(row, item_id), item=shaped(session, other))
            )
    linked.sort(key=lambda each: (SIDE_ORDER[each.kind], (each.item.name or "").lower()))
    return counted_page(linked, decode_offset(cursor) if cursor else 0, limit)
