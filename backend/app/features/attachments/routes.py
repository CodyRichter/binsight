from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.attachments import service

router = APIRouter(prefix="/attachments")

# A photo's file never changes once stored, so the browser can keep it.
PHOTO_CACHING = {"Cache-Control": "private, max-age=31536000, immutable"}


@router.get(
    "/{attachment_id}/file",
    operation_id="get_attachment_file",
    response_class=FileResponse,
    responses={200: {"content": {"image/jpeg": {}}}, **refusals(404)},
)
def get_attachment_file(
    attachment_id: str, session: ReadSession, settings: AppSettings
) -> FileResponse:
    path = service.photo_file(session, settings, attachment_id)
    return FileResponse(path, media_type="image/jpeg", headers=PHOTO_CACHING)
