from datetime import datetime
from typing import Any

from sqlalchemy import ColumnElement, case, func, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.settings import Settings
from app.core.stored_files import remove_after_commit
from app.core.table_rows import ExportTables, table_rows
from app.features.attachments.schemas import (
    Attachment as Attachment,
)  # re-exported: items and locations reach attachments only through this file
from app.features.attachments.schemas import FileOnDisk as FileOnDisk
from app.features.attachments.schemas import StoredFile as StoredFile
from app.features.attachments.storing import MAX_FILE_BYTES as MAX_FILE_BYTES
from app.features.attachments.storing import MAX_PHOTO_BYTES as MAX_PHOTO_BYTES
from app.features.attachments.storing import file_from_base64 as file_from_base64
from app.features.attachments.storing import photo_from_base64 as photo_from_base64
from app.features.attachments.storing import saved_file as saved_file
from app.features.attachments.storing import saved_photo as saved_photo
from app.models import AttachmentKind

RECORDED = (
    "item_id",
    "location_id",
    "kind",
    "path",
    "url",
    "filename",
    "content_type",
    "size",
    "position",
)


def _fields(attachment: models.Attachment) -> dict[str, Any]:
    return {field: getattr(attachment, field) for field in RECORDED}


def _next_position(session: Session, item_id: str) -> int:
    last = session.scalar(
        select(func.max(models.Attachment.position)).where(models.Attachment.item_id == item_id)
    )
    return 0 if last is None else last + 1


def _added(session: Session, attachment: models.Attachment) -> dict[str, Any]:
    session.add(attachment)
    return _fields(attachment)


def attach_to_item(
    session: Session, item_id: str, stored: StoredFile, kind: AttachmentKind, now: datetime
) -> dict[str, Any]:
    """Record a stored photo or file as an item's; returns its fields, for the caller's history."""
    return _added(
        session,
        models.Attachment(
            id=stored.id,
            item_id=item_id,
            kind=kind,
            path=stored.path,
            filename=stored.filename,
            content_type=stored.content_type,
            size=stored.size,
            position=_next_position(session, item_id),
            created_at=now,
            updated_at=now,
        ),
    )


def attach_link(
    session: Session, item_id: str, url: str, name: str | None, now: datetime
) -> tuple[str, dict[str, Any]]:
    """Record a web link as an item's; returns its identifier and fields, for history."""
    identifier = new_identifier()
    attachment = models.Attachment(
        id=identifier,
        item_id=item_id,
        kind=AttachmentKind.link,
        url=url,
        filename=name,
        position=_next_position(session, item_id),
        created_at=now,
        updated_at=now,
    )
    return identifier, _added(session, attachment)


def attach_to_location(
    session: Session, location_id: str, stored: StoredFile, now: datetime
) -> dict[str, Any]:
    """Record a stored photo as a location's; returns its fields, for the caller's history."""
    return _added(
        session,
        models.Attachment(
            id=stored.id,
            location_id=location_id,
            kind=AttachmentKind.photo,
            path=stored.path,
            filename=stored.filename,
            content_type=stored.content_type,
            size=stored.size,
            position=0,
            created_at=now,
            updated_at=now,
        ),
    )


def _not_found() -> AppError:
    return AppError(404, "attachment_not_found", "That attachment does not exist.")


def _get(session: Session, attachment_id: str) -> models.Attachment:
    attachment = session.get(models.Attachment, attachment_id)
    if attachment is None:
        raise _not_found()
    return attachment


def _file_url(attachment: models.Attachment) -> str | None:
    return f"/api/attachments/{attachment.id}/file" if attachment.path else None


def _shaped(attachment: models.Attachment) -> Attachment:
    return Attachment(
        id=attachment.id,
        kind=attachment.kind,
        filename=attachment.filename,
        url=attachment.url,
        content_type=attachment.content_type,
        size=attachment.size,
        file_url=_file_url(attachment),
        created_at=attachment.created_at,
    )


def get_item_attachment(session: Session, item_id: str, attachment_id: str) -> Attachment:
    """One of an item's attachments, refused when it is not that item's."""
    attachment = _get(session, attachment_id)
    if attachment.item_id != item_id:
        raise _not_found()
    return _shaped(attachment)


def list_item_attachments(session: Session, item_id: str) -> list[Attachment]:
    """An item's attachments: its photos first, then its files and links, in the order added."""
    photos_first = case((models.Attachment.kind == AttachmentKind.photo, 0), else_=1)
    query = (
        select(models.Attachment)
        .where(models.Attachment.item_id == item_id)
        .order_by(photos_first, models.Attachment.position, models.Attachment.id)
    )
    return [_shaped(attachment) for attachment in session.scalars(query)]


def count_item_photos(session: Session, item_id: str) -> int:
    """How many photos an item has."""
    query = select(func.count()).where(
        models.Attachment.item_id == item_id, models.Attachment.kind == AttachmentKind.photo
    )
    return session.scalar(query) or 0


def detach(session: Session, attachment_id: str) -> dict[str, Any]:
    """Remove an attachment's record, keeping its file so Undo can bring it back."""
    attachment = _get(session, attachment_id)
    session.delete(attachment)
    return _fields(attachment)


def _first_photo(session: Session, owner: ColumnElement[bool]) -> str | None:
    query = (
        select(models.Attachment.id)
        .where(owner, models.Attachment.kind == AttachmentKind.photo)
        .order_by(models.Attachment.position, models.Attachment.id)
    )
    return session.scalars(query).first()


def photo_url(session: Session, item_id: str) -> str | None:
    """The address of an item's picture, or None when it has no photo."""
    first = _first_photo(session, models.Attachment.item_id == item_id)
    return f"/api/attachments/{first}/file" if first else None


def location_photo_id(session: Session, location_id: str) -> str | None:
    """The identifier of a location's photo, or None when it has none."""
    return _first_photo(session, models.Attachment.location_id == location_id)


def location_photo_url(session: Session, location_id: str) -> str | None:
    """The address of a location's photo, or None when it has none."""
    photo = location_photo_id(session, location_id)
    return f"/api/attachments/{photo}/file" if photo else None


def location_photo_urls(session: Session) -> dict[str, str]:
    """The address of each location's photo, by location, for those that have one."""
    query = select(models.Attachment.location_id, models.Attachment.id).where(
        models.Attachment.location_id.is_not(None)
    )
    return {
        location_id: f"/api/attachments/{photo_id}/file"
        for location_id, photo_id in session.execute(query)
        if location_id is not None
    }


def attachment_file(session: Session, settings: Settings, attachment_id: str) -> FileOnDisk:
    """Where a photo's or file's bytes are in the data directory; a web link has none."""
    attachment = _get(session, attachment_id)
    if attachment.path is None or attachment.content_type is None:
        raise _not_found()
    path = settings.data_directory / attachment.path
    return FileOnDisk(path, attachment.content_type, attachment.filename)


def forget_attachment(session: Session, settings: Settings, attachment_id: str) -> None:
    """Delete an attachment's record, and its file once the deletion is committed."""
    attachment = _get(session, attachment_id)
    session.delete(attachment)
    if attachment.path is not None:
        remove_after_commit(session, settings.data_directory / attachment.path)


def export_tables(session: Session) -> ExportTables:
    """Every photo, file and web link's record as stored, for the export."""
    return {"attachments": table_rows(session, models.Attachment)}
