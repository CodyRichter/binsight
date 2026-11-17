from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.history.schemas import HistoryEntry, RecordType
from app.models import Actor


@dataclass(frozen=True)
class RecordChange:
    """One record's changed fields, before and after; `before` is None for a create."""

    record_type: RecordType
    record_id: str
    before: dict[str, Any] | None
    after: dict[str, Any]


def record(
    session: Session, actor: Actor, action: str, changes: list[RecordChange], now: datetime
) -> str:
    """Write down one change to the home, so it shows in history and can be undone."""
    entry = models.HistoryEntry(id=new_identifier(), at=now, actor=actor, action=action)
    entry.changes = [
        models.HistoryChange(
            id=new_identifier(),
            record_type=change.record_type,
            record_id=change.record_id,
            before=change.before,
            after=change.after,
        )
        for change in changes
    ]
    session.add(entry)
    return entry.id


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
