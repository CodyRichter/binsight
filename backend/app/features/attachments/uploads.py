import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.settings import Settings
from app.core.stored_files import remove_after_commit
from app.features.attachments.schemas import NewUpload, UploadReceived
from app.features.attachments.storing import MAX_FILE_BYTES

LIFETIME = timedelta(hours=1)


def _hash(upload_id: str) -> str:
    return hashlib.sha256(upload_id.encode()).hexdigest()


def _forget_expired(session: Session, settings: Settings, now: datetime) -> None:
    expired = select(models.Upload).where(models.Upload.expires_at <= now)
    for upload in list(session.scalars(expired)):
        session.delete(upload)
        # Named by id rather than path, so a file whose sending failed to commit goes too.
        remove_after_commit(session, settings.uploads_directory / upload.id)


def create_upload(session: Session, settings: Settings, now: datetime) -> NewUpload:
    """Hand out an address a photo or file can be sent to, good for one hour."""
    _forget_expired(session, settings, now)
    upload_id = secrets.token_urlsafe(32)
    expires_at = now + LIFETIME
    session.add(
        models.Upload(
            id=new_identifier(),
            token_hash=_hash(upload_id),
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
    )
    upload_url = f"{settings.app_address}/api/attachments/uploads/{upload_id}"
    return NewUpload(upload_id=upload_id, upload_url=upload_url, expires_at=expires_at)


def _current(session: Session, upload_id: str, now: datetime) -> models.Upload:
    query = select(models.Upload).where(models.Upload.token_hash == _hash(upload_id))
    upload = session.scalars(query).one_or_none()
    if upload is None:
        raise AppError(404, "upload_not_found", "There is no such upload. Create a new one.")
    if upload.expires_at <= now:
        raise AppError(409, "upload_expired", "That upload has expired. Create a new one.")
    return upload


def receive_upload(
    session: Session, settings: Settings, upload_id: str, content: bytes, now: datetime
) -> UploadReceived:
    """Keep the file sent to an upload address; an upload takes one file, once."""
    upload = _current(session, upload_id, now)
    if upload.path is not None:
        raise AppError(409, "upload_already_sent", "A file was already sent to this upload.")
    if len(content) > MAX_FILE_BYTES:
        raise AppError(422, "file_too_large", "That file is larger than 50 MB.")
    settings.uploads_directory.mkdir(parents=True, exist_ok=True)
    upload.path = f"{settings.uploads_directory.name}/{upload.id}"
    upload.size = len(content)
    upload.updated_at = now
    file = settings.data_directory / upload.path
    file.write_bytes(content)
    return UploadReceived(upload_id=upload_id, size=len(content), expires_at=upload.expires_at)


def uploaded_content(session: Session, settings: Settings, upload_id: str, now: datetime) -> bytes:
    """The bytes of the file sent to an upload, to be stored as a photo or file."""
    upload = _current(session, upload_id, now)
    if upload.path is None:
        raise AppError(
            409, "upload_not_sent", "No file has been sent to this upload's address yet."
        )
    return (settings.data_directory / upload.path).read_bytes()
