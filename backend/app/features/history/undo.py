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

UNDOABLE = {
    "item.created",
    "items.created",
    "item.updated",
    "item.named",
    "item.moved",
    "item.deleted",
    "item.restored",
    "item.marked_missing",
    "item.found",
    "location.checked",
    "location.moved",
}

type Undoable = models.Item | models.Attachment | models.Location | models.Check


def _entry(session: Session, entry_id: str) -> models.HistoryEntry:
    entry = session.get(models.HistoryEntry, entry_id)
    if entry is None:
        raise AppError(404, "history_entry_not_found", "That change is not in history.")
    if entry.undone_by is not None:
        raise AppError(409, "already_undone", "That change has already been undone.")
    if entry.action not in UNDOABLE:
        raise AppError(409, "undo_not_supported", "That change can't be undone.")
    return entry


def _record(session: Session, change: models.HistoryChange) -> Undoable | None:
    if change.record_type == "attachment":
        return session.get(models.Attachment, change.record_id)
    if change.record_type == "location":
        return session.get(models.Location, change.record_id)
    if change.record_type == "check":
        return session.get(models.Check, change.record_id)
    return session.get(models.Item, change.record_id)


def _as_recorded(value: object) -> object:
    # History is JSON, so times are kept as ISO text.
    return value.isoformat() if isinstance(value, datetime) else value


def _as_field(key: str, value: object) -> object:
    if key == "deleted_at" and isinstance(value, str):
        return datetime.fromisoformat(value)
    return value


def _deleted_since(current: Undoable, change: models.HistoryChange) -> bool:
    return (
        isinstance(current, models.Item)
        and current.deleted_at is not None
        and "deleted_at" not in change.after
    )


def _current(session: Session, change: models.HistoryChange) -> Undoable:
    # Undo reads and writes these tables directly: the one exception to features keeping to theirs.
    current = _record(session, change)
    if (
        current is None
        or _deleted_since(current, change)
        or any(_as_recorded(getattr(current, key)) != value for key, value in change.after.items())
    ):
        raise AppError(409, "changed_since", "That can't be undone, because it has changed since.")
    return current


def _refuse_cycle(session: Session, location: models.Location, parent_id: str) -> None:
    # The old parent may have been moved inside this location since.
    above = session.get(models.Location, parent_id)
    while above is not None:
        if above.id == location.id:
            raise AppError(
                409, "changed_since", "That can't be undone, because it has changed since."
            )
        above = session.get(models.Location, above.parent_id) if above.parent_id else None


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
        if isinstance(current, models.Location) and change.before.get("parent_id"):
            _refuse_cycle(session, current, change.before["parent_id"])
        for key, value in change.before.items():
            setattr(current, key, _as_field(key, value))
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
