from fastapi import APIRouter, Response

from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.labels import service

router = APIRouter(prefix="/labels")


@router.get(
    "/{code}/image",
    operation_id="get_label_image",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}}, **refusals(404)},
)
def get_label_image(code: str, session: ReadSession, settings: AppSettings) -> Response:
    image = service.label_image(session, code, settings.app_address)
    return Response(
        image.png,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{image.code}.png"'},
    )
