from fastapi import APIRouter

from app.core import clock
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.features.locations import service
from app.features.locations.schemas import (
    Location,
    LocationCreated,
    LocationMove,
    LocationMoved,
    LocationTree,
    NewLocation,
)
from app.models import Actor

router = APIRouter(prefix="/locations")


@router.post("", operation_id="create_location", status_code=201, responses=refusals(404, 422))
def create_location(body: NewLocation, session: WriteSession) -> LocationCreated:
    return service.create_location(session, body, Actor.app, clock.now())


@router.get("", operation_id="list_locations")
def list_locations(session: ReadSession) -> LocationTree:
    return service.list_locations(session)


@router.get("/{location_id}", operation_id="get_location", responses=refusals(404))
def get_location(location_id: str, session: ReadSession) -> Location:
    return service.get_location(session, location_id)


@router.post("/{location_id}/move", operation_id="move_location", responses=refusals(404, 409, 422))
def move_location(location_id: str, body: LocationMove, session: WriteSession) -> LocationMoved:
    return service.move_location(session, location_id, body, Actor.app, clock.now())
