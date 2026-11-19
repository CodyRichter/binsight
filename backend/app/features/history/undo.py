from datetime import date, datetime
from typing import Any, cast

from sqlalchemy import select
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
    "items.imported",
    "item.updated",
    "item.named",
    "item.moved",
    "item.deleted",
    "item.restored",
    "item.marked_missing",
    "item.found",
    "item.status_changed",
    "item.lent",
    "item.returned",
    "item.linked",
    "item.unlinked",
    "item.photo_added",
    "item.file_attached",
    "item.web_link_attached",
    "item.attachment_removed",
    "location.photo_changed",
    "location.checked",
    "location.moved",
    "location.updated",
    "location.deleted",
    "location.merged",
    "location.restored",
    "location.reordered",
    "saved_search.created",
    "saved_search.renamed",
    "saved_search.pinned",
    "saved_search.unpinned",
    "saved_search.deleted",
}

type Undoable = (
    models.Item
    | models.Attachment
    | models.Location
    | models.Check
    | models.Label
    | models.ItemLink
    | models.SavedSearch
)


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
    if change.record_type == "label":
        return session.get(models.Label, change.record_id)
    if change.record_type == "link":
        return session.get(models.ItemLink, change.record_id)
    if change.record_type == "saved_search":
        return session.get(models.SavedSearch, change.record_id)
    return session.get(models.Item, change.record_id)


DATED_FIELDS = {
    "deleted_at": datetime.fromisoformat,
    "lent_at": datetime.fromisoformat,
    "retired_at": datetime.fromisoformat,
    "purchase_date": date.fromisoformat,
    "warranty_ends": date.fromisoformat,
    "return_ends": date.fromisoformat,
}


def _as_recorded(value: object) -> object:
    # History is JSON, so times and dates are kept as ISO text.
    return value.isoformat() if isinstance(value, date) else value


def _as_field(key: str, value: object) -> object:
    if key in DATED_FIELDS and isinstance(value, str):
        return DATED_FIELDS[key](value)
    return value


def _deleted_since(current: Undoable, change: models.HistoryChange) -> bool:
    return (
        isinstance(current, models.Item | models.Location)
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
        raise _changed_since()
    return current


def _refuse_cycle(session: Session, location: models.Location, parent_id: str) -> None:
    # The old parent may have been moved inside this location since.
    above = session.get(models.Location, parent_id)
    while above is not None:
        if above.id == location.id:
            raise _changed_since()
        above = session.get(models.Location, above.parent_id) if above.parent_id else None


def _remove_location(session: Session, location: models.Location) -> None:
    # Anything put in it since, or a label stuck on it, means it has changed.
    held = (
        select(models.Item.id).where(models.Item.home_location_id == location.id),
        select(models.Location.id).where(models.Location.parent_id == location.id),
        select(models.Label.id).where(models.Label.location_id == location.id),
        select(models.Check.id).where(models.Check.location_id == location.id),
        select(models.Attachment.id).where(models.Attachment.location_id == location.id),
    )
    if any(session.scalar(query) is not None for query in held):
        raise _changed_since()
    session.delete(location)


def _depth(session: Session, location_id: str) -> int:
    location = session.get(models.Location, location_id)
    return (
        0
        if location is None or location.parent_id is None
        else 1 + _depth(session, location.parent_id)
    )


def _undo_order(session: Session, change: models.HistoryChange) -> tuple[int, int]:
    # Photos go before the items they belong to, and items before new locations, deepest first.
    if change.record_type == "attachment":
        return (0, 0)
    if change.record_type == "location" and change.before is None:
        return (2, -_depth(session, change.record_id))
    return (1, 0)


def _changed_since() -> AppError:
    return AppError(409, "changed_since", "That can't be undone, because it has changed since.")


def _recreate_link(
    session: Session, record_id: str, removed: dict[str, Any], now: datetime
) -> None:
    # The same two items may have been linked again since, which a second link would duplicate.
    same = select(models.ItemLink.id).filter_by(**removed)
    if session.scalar(same) is not None:
        raise _changed_since()
    session.add(models.ItemLink(id=record_id, **removed, created_at=now, updated_at=now))


def _recreate_attachment(
    session: Session, record_id: str, removed: dict[str, Any], now: datetime
) -> None:
    # A location has one photo, and it may have been given another since.
    location_id = removed["location_id"]
    other = select(models.Attachment.id).where(models.Attachment.location_id == location_id)
    if location_id is not None and session.scalar(other) is not None:
        raise _changed_since()
    kind = models.AttachmentKind(removed["kind"])
    fields = {**removed, "kind": kind}
    session.add(models.Attachment(id=record_id, **fields, created_at=now, updated_at=now))


def _recreate(session: Session, change: models.HistoryChange, now: datetime) -> None:
    removed: dict[str, Any] = change.before or {}
    if change.record_type == "saved_search":
        session.add(
            models.SavedSearch(id=change.record_id, **removed, created_at=now, updated_at=now)
        )
    elif change.record_type == "attachment":
        _recreate_attachment(session, change.record_id, removed, now)
    else:
        _recreate_link(session, change.record_id, removed, now)


def _reverse(
    session: Session, settings: Settings, change: models.HistoryChange, now: datetime
) -> RecordChange:
    record_type = cast(RecordType, change.record_type)
    # Links, saved searches and attachments are removed outright, so nothing is recorded after.
    if not change.after:
        _recreate(session, change, now)
        session.flush()
        return RecordChange(record_type, change.record_id, {}, change.before or {})
    current = _current(session, change)
    after: dict[str, Any] = change.after
    if change.before is None and isinstance(current, models.Attachment):
        attachments.forget_attachment(session, settings, current.id)
    elif change.before is None and isinstance(current, models.Location):
        _remove_location(session, current)
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
    return RecordChange(record_type, change.record_id, after, undone_to)


def undo(
    session: Session, settings: Settings, entry_id: str, actor: Actor, now: datetime
) -> Undone:
    entry = _entry(session, entry_id)
    ordered = sorted(entry.changes, key=lambda change: _undo_order(session, change))
    reversed_changes = [_reverse(session, settings, change, now) for change in ordered]
    undo_id = record(session, actor, "history.undone", reversed_changes, now)
    session.flush()
    entry.undone_by = undo_id
    return Undone(history_entry_id=undo_id, undone_entry_id=entry.id)
