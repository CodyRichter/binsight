from fastapi import APIRouter, Response

from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.labels import service
from app.features.labels.schemas import PrintAddress, PrintedLabel

router = APIRouter(prefix="/labels")
print_router = APIRouter(prefix="/labels")
print_address_router = APIRouter(prefix="/labels")


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


@router.get("/print-address", operation_id="get_print_address")
def get_print_address(session: ReadSession) -> PrintAddress:
    return service.get_print_address(session)


@print_router.post("/{code}/print", operation_id="print_label", responses=refusals(404, 409, 502))
def print_label(code: str, session: ReadSession, settings: AppSettings) -> PrintedLabel:
    return service.print_label(session, code, settings.app_address)


@print_address_router.patch(
    "/print-address", operation_id="set_print_address", responses=refusals(422)
)
def set_print_address(body: PrintAddress, session: WriteSession) -> PrintAddress:
    return service.set_print_address(session, body)
