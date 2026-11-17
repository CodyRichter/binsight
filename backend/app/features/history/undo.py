from datetime import datetime
from typing import Any, cast

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.history.recording import RecordChange, record
from app.features.history.schemas import RecordType, Undone
from app.models import Actor

UNDOABLE = {"item.created", "items.created", "item.updated", "item.named"}


def _entry(session: Session, entry_id: str) -> models.HistoryEntry:
    entry = session.get(models.HistoryEntry, entry_id)
    if entry is None:
        raise AppError(404, "history_entry_not_found", "That change is not in history.")
    if entry.undone_by is not None:
        raise AppError(409, "already_undone", "That change has already been undone.")
    if entry.action not in UNDOABLE:
        raise AppError(409, "undo_not_supported", "That change can't be undone.")
    return entry


def _current(session: Session, change: models.HistoryChange) -> models.Item | models.Attachment:
    # Undo reads and writes these tables directly: the one exception to features keeping to theirs.
    current: models.Item | models.Attachment | None = (
        session.get(models.Attachment, change.record_id)
        if change.record_type == "attachment"
        else session.get(models.Item, change.record_id)
    )
    if current is None or any(
        getattr(current, key) != value for key, value in change.after.items()
    ):
        raise AppError(409, "changed_since", "That can't be undone, because it has changed since.")
    return current


def _reverse(
    session: Session, settings: Settings, change: models.HistoryChange, now: datetime
) -> RecordChange:
    current = _current(session, change)
    after: dict[str, Any] = change.after
    if change.before is None and isinstance(current, models.Attachment):
        attachments.forget_photo(session, settings, current.id)
    elif change.before is None:
        session.delete(current)
    else:
        for key, value in change.before.items():
            setattr(current, key, value)
        current.updated_at = now
    # A record that was created is now gone, so it has nothing after.
    undone_to = change.before or {}
    session.flush()
    record_type = cast(RecordType, change.record_type)
    return RecordChange(record_type, change.record_id, after, undone_to)


def undo(
    session: Session, settings: Settings, entry_id: str, actor: Actor, now: datetime
) -> Undone:
    entry = _entry(session, entry_id)
    # Photos go before the items they belong to.
    ordered = sorted(entry.changes, key=lambda change: change.record_type != "attachment")
    reversed_changes = [_reverse(session, settings, change, now) for change in ordered]
    undo_id = record(session, actor, "history.undone", reversed_changes, now)
    session.flush()
    entry.undone_by = undo_id
    return Undone(history_entry_id=undo_id, undone_entry_id=entry.id)
