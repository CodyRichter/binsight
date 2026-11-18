from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile

from app.core import clock
from app.core.database import ReadSession, WriteSession, open_write_session
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.attachments import service as attachments
from app.features.attachments.service import Attachment
from app.features.items import service
from app.features.items.schemas import AttachmentAdded, AttachmentRemoved, NewWebLink
from app.models import Actor

# An item's attachments are its own, so items owns their addresses.
router = APIRouter(prefix="/items/{item_id}")


@router.get("/attachments", operation_id="list_item_attachments", responses=refusals(400, 404))
def list_item_attachments(
    item_id: str, session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Attachment]:
    return service.list_item_attachments(session, item_id, limit, cursor)


@router.post(
    "/photos", operation_id="add_item_photo", status_code=201, responses=refusals(404, 409, 422)
)
def add_item_photo(
    item_id: str, request: Request, settings: AppSettings, photo: Annotated[UploadFile, File()]
) -> AttachmentAdded:
    raw = photo.file.read(attachments.MAX_PHOTO_BYTES + 1)
    # The upload is stored before the write transaction starts, so the lock is held only briefly.
    with (
        attachments.saved_photo(settings, raw, photo.filename) as stored,
        open_write_session(request.app.state.engine) as session,
    ):
        return service.add_item_photo(session, item_id, stored, Actor.app, clock.now())


@router.post(
    "/files", operation_id="attach_file", status_code=201, responses=refusals(404, 409, 422)
)
def attach_file(
    item_id: str, request: Request, settings: AppSettings, file: Annotated[UploadFile, File()]
) -> AttachmentAdded:
    raw = file.file.read(attachments.MAX_FILE_BYTES + 1)
    with (
        attachments.saved_file(settings, raw, file.filename) as stored,
        open_write_session(request.app.state.engine) as session,
    ):
        return service.attach_file(session, item_id, stored, Actor.app, clock.now())


@router.post(
    "/web-links",
    operation_id="attach_web_link",
    status_code=201,
    responses=refusals(404, 409, 422),
)
def attach_web_link(item_id: str, body: NewWebLink, session: WriteSession) -> AttachmentAdded:
    return service.attach_web_link(session, item_id, body, Actor.app, clock.now())


@router.delete(
    "/attachments/{attachment_id}",
    operation_id="remove_item_attachment",
    responses=refusals(404, 409),
)
def remove_item_attachment(
    item_id: str, attachment_id: str, session: WriteSession
) -> AttachmentRemoved:
    return service.remove_item_attachment(session, item_id, attachment_id, Actor.app, clock.now())
