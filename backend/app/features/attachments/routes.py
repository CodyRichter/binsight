from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.attachments import service

router = APIRouter(prefix="/attachments")

# A stored file never changes, so the browser can keep it.
FILE_CACHING = {"Cache-Control": "private, max-age=31536000, immutable"}
SERVED_TYPES = ("image/jpeg", "image/png", "image/webp", "application/pdf")


@router.get(
    "/{attachment_id}/file",
    operation_id="get_attachment_file",
    response_class=FileResponse,
    responses={200: {"content": {kind: {} for kind in SERVED_TYPES}}, **refusals(404)},
)
def get_attachment_file(
    attachment_id: str, session: ReadSession, settings: AppSettings
) -> FileResponse:
    file = service.attachment_file(session, settings, attachment_id)
    return FileResponse(
        file.path,
        media_type=file.content_type,
        headers=FILE_CACHING,
        filename=file.filename,
        content_disposition_type="inline",
    )
