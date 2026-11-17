import base64
import binascii
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.settings import Settings
from app.core.stored_files import remove_after_commit
from app.features.attachments.schemas import (
    StoredPhoto as StoredPhoto,
)  # re-exported: items reach attachments only through this file
from app.models import AttachmentKind

MAX_PHOTO_BYTES = 20 * 1024 * 1024
LONGEST_EDGE = 2048
PHOTO_FORMATS = {"JPEG", "PNG", "WEBP"}


def _unsupported() -> AppError:
    return AppError(
        422, "unsupported_photo", "That photo could not be read; send a JPEG, PNG or WebP."
    )


def _too_large() -> AppError:
    return AppError(422, "photo_too_large", "That photo is larger than 20 MB.")


def photo_from_base64(text: str) -> bytes:
    """The bytes of a photo sent as base64 text."""
    try:
        return base64.b64decode(text, validate=True)
    except binascii.Error as error:
        raise _unsupported() from error


def _upright_jpeg(raw: bytes) -> bytes:
    try:
        image = Image.open(BytesIO(raw))
        if image.format not in PHOTO_FORMATS:
            raise _unsupported()
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise _unsupported() from error
    upright = ImageOps.exif_transpose(image).convert("RGB")
    upright.thumbnail((LONGEST_EDGE, LONGEST_EDGE))
    output = BytesIO()
    # Saved without the original's metadata, so a photo never carries where it was taken.
    upright.save(output, format="JPEG", quality=85)
    return output.getvalue()


@contextmanager
def saved_photo(settings: Settings, raw: bytes, filename: str | None) -> Iterator[StoredPhoto]:
    """Store a photo upright as JPEG; if the action using it then fails, delete it again."""
    if len(raw) > MAX_PHOTO_BYTES:
        raise _too_large()
    jpeg = _upright_jpeg(raw)
    settings.attachments_directory.mkdir(parents=True, exist_ok=True)
    identifier = new_identifier()
    folder = settings.attachments_directory.name
    stored = StoredPhoto(identifier, f"{folder}/{identifier}.jpg", filename)
    file = settings.data_directory / stored.path
    file.write_bytes(jpeg)
    try:
        yield stored
    except BaseException:
        file.unlink(missing_ok=True)
        raise


def attach_photo(
    session: Session, item_id: str, stored: StoredPhoto, now: datetime
) -> dict[str, Any]:
    """Make a stored photo an item's picture; returns its fields, for the caller's history."""
    attachment = models.Attachment(
        id=stored.id,
        item_id=item_id,
        kind=AttachmentKind.photo,
        path=stored.path,
        filename=stored.filename,
        position=0,
        created_at=now,
        updated_at=now,
    )
    session.add(attachment)
    return {"item_id": item_id, "kind": "photo", "path": stored.path, "filename": stored.filename}


def photo_url(session: Session, item_id: str) -> str | None:
    """The address of an item's picture, or None when it has no photo."""
    first = session.scalars(
        select(models.Attachment.id)
        .where(models.Attachment.item_id == item_id)
        .order_by(models.Attachment.position)
    ).first()
    return f"/api/attachments/{first}/file" if first else None


def _get(session: Session, attachment_id: str) -> models.Attachment:
    attachment = session.get(models.Attachment, attachment_id)
    if attachment is None:
        raise AppError(404, "attachment_not_found", "That photo does not exist.")
    return attachment


def photo_file(session: Session, settings: Settings, attachment_id: str) -> Path:
    """Where a photo's file is in the data directory."""
    return settings.data_directory / _get(session, attachment_id).path


def forget_photo(session: Session, settings: Settings, attachment_id: str) -> None:
    """Delete a photo's record, and its file once the deletion is committed."""
    attachment = _get(session, attachment_id)
    session.delete(attachment)
    remove_after_commit(session, settings.data_directory / attachment.path)
