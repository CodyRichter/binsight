from fastapi import APIRouter

from app.core import clock
from app.core.database import WriteSession
from app.core.errors import refusals
from app.features.checks import service
from app.features.checks.schemas import CheckLocation, LocationChecked
from app.models import Actor

router = APIRouter(prefix="/locations")


@router.post(
    "/{location_id}/check", operation_id="check_location", responses=refusals(404, 409, 422)
)
def check_location(location_id: str, body: CheckLocation, session: WriteSession) -> LocationChecked:
    return service.check_location(session, location_id, body, Actor.app, clock.now())
