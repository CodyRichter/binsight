from typing import Annotated

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse

from app.core import clock
from app.core.access import IsVisitor
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.attachments import service
from app.features.attachments.schemas import NewUpload, UploadReceived

router = APIRouter(prefix="/attachments")
uploads_router = APIRouter(prefix="/attachments")

# A stored file never changes, so the browser can keep it.
FILE_CACHING = {"Cache-Control": "private, max-age=31536000, immutable"}
SERVED_TYPES = ("image/jpeg", "image/png", "image/webp", "application/pdf")


@router.get(
    "/{attachment_id}/file",
    operation_id="get_attachment_file",
    response_class=FileResponse,
    responses={200: {"content": {kind: {} for kind in SERVED_TYPES}}, **refusals(401, 404)},
)
def get_attachment_file(
    attachment_id: str, session: ReadSession, settings: AppSettings, visitor: IsVisitor
) -> FileResponse:
    file = service.attachment_file(session, settings, attachment_id, visitor)
    return FileResponse(
        file.path,
        media_type=file.content_type,
        headers=FILE_CACHING,
        filename=file.filename,
        content_disposition_type="inline",
    )


@uploads_router.post("/uploads", operation_id="create_upload", status_code=201)
def create_upload(session: WriteSession, settings: AppSettings) -> NewUpload:
    return service.create_upload(session, settings, clock.now())


@router.post(
    "/uploads/{upload_id}",
    operation_id="send_upload",
    status_code=201,
    responses=refusals(404, 409, 422),
)
def send_upload(
    upload_id: str,
    file: Annotated[UploadFile, File()],
    session: WriteSession,
    settings: AppSettings,
) -> UploadReceived:
    content = file.file.read(service.MAX_FILE_BYTES + 1)
    return service.receive_upload(session, settings, upload_id, content, clock.now())
