from fastapi import APIRouter, Response

from app.core import clock
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.labels import service
from app.features.labels.schemas import (
    BlankLabelsCreated,
    Label,
    LabelClaim,
    LabelClaimed,
    NewBlankLabels,
)
from app.models import Actor

router = APIRouter(prefix="/labels")


@router.post("/blank", operation_id="create_blank_labels", status_code=201, responses=refusals(422))
def create_blank_labels(body: NewBlankLabels, session: WriteSession) -> BlankLabelsCreated:
    return service.create_blank_labels(session, body, Actor.app, clock.now())


@router.get("", operation_id="list_labels", responses=refusals(400, 422))
def list_labels(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Label]:
    return service.list_labels(session, limit, cursor)


@router.get("/{code}", operation_id="get_label", responses=refusals(404))
def get_label(code: str, session: ReadSession) -> Label:
    return service.get_label(session, code)


@router.post("/{code}/claim", operation_id="claim_label", responses=refusals(404, 409, 422))
def claim_label(code: str, body: LabelClaim, session: WriteSession) -> LabelClaimed:
    return service.claim_label(session, code, body, Actor.app, clock.now())


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
