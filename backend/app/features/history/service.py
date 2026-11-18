from datetime import datetime

from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.core.settings import Settings
from app.features.history import undo as undoing
from app.features.history.recording import RecordChange as RecordChange
from app.features.history.recording import record as record
from app.features.history.schemas import HistoryEntry, Undone
from app.models import Actor


def list_item_history(
    session: Session, item_id: str, limit: int, cursor: str | None
) -> Page[HistoryEntry]:
    """List the changes made to one item, its links and its attachments, newest first."""
    change = models.HistoryChange
    touching_item = select(change.entry_id).where(
        or_(
            and_(change.record_type == "item", change.record_id == item_id),
            and_(change.record_type == "link", _names_item(item_id, LINK_ENDS)),
            and_(change.record_type == "attachment", _names_item(item_id, ("$.item_id",))),
        )
    )
    newest_first = (
        select(models.HistoryEntry)
        .where(models.HistoryEntry.id.in_(touching_item))
        .order_by(models.HistoryEntry.at.desc(), models.HistoryEntry.id.desc())
        .options(selectinload(models.HistoryEntry.changes))
        .limit(limit + 1)
    )
    if cursor is not None:
        at, identifier = decode_cursor(cursor)
        written_at, written_id = models.HistoryEntry.at, models.HistoryEntry.id
        older = or_(written_at < at, and_(written_at == at, written_id < identifier))
        newest_first = newest_first.where(older)
    entries = list(session.scalars(newest_first))
    last = entries[limit - 1] if len(entries) > limit else None
    return Page(
        items=[HistoryEntry.model_validate(row, from_attributes=True) for row in entries[:limit]],
        next_cursor=encode_cursor(last.at, last.id) if last else None,
    )


LINK_ENDS = ("$.item_id", "$.other_item_id")


def _names_item(item_id: str, ends: tuple[str, ...]) -> ColumnElement[bool]:
    # A link or attachment change holds its item's identifier, after when made, before when removed.
    sides = (models.HistoryChange.before, models.HistoryChange.after)
    return or_(*(func.json_extract(side, end) == item_id for side in sides for end in ends))


def lent_to_names(session: Session) -> list[str]:
    """Every name an item has been lent to, most recently lent first, each once."""
    name = func.json_extract(models.HistoryChange.after, "$.lent_to")
    query = (
        select(name)
        .join(models.HistoryEntry, models.HistoryEntry.id == models.HistoryChange.entry_id)
        .where(models.HistoryEntry.action == "item.lent", name.is_not(None))
        .order_by(models.HistoryEntry.at.desc())
    )
    return list(dict.fromkeys(str(each) for each in session.scalars(query)))


def recently_moved_item_ids(session: Session, since: datetime) -> list[str]:
    """The items moved since a moment, most recently first, each once, leaving out undone moves."""
    query = (
        select(models.HistoryChange.record_id)
        .join(models.HistoryEntry, models.HistoryEntry.id == models.HistoryChange.entry_id)
        .where(
            models.HistoryEntry.action == "item.moved",
            models.HistoryEntry.undone_by.is_(None),
            models.HistoryEntry.at >= since,
            models.HistoryChange.record_type == "item",
        )
        .order_by(models.HistoryEntry.at.desc(), models.HistoryEntry.id.desc())
    )
    return list(dict.fromkeys(session.scalars(query)))


def undo(
    session: Session, settings: Settings, entry_id: str, actor: Actor, now: datetime
) -> Undone:
    """Put back what one change did, as a new change, if nothing has changed it since."""
    return undoing.undo(session, settings, entry_id, actor, now)
