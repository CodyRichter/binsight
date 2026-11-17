from datetime import datetime

from sqlalchemy import and_, or_, select
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
    """List the changes made to one item, newest first."""
    touching_item = select(models.HistoryChange.entry_id).where(
        models.HistoryChange.record_type == "item", models.HistoryChange.record_id == item_id
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


def undo(
    session: Session, settings: Settings, entry_id: str, actor: Actor, now: datetime
) -> Undone:
    """Put back what one change did, as a new change, if nothing has changed it since."""
    return undoing.undo(session, settings, entry_id, actor, now)
