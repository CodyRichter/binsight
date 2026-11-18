from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile

from app.core import clock
from app.core.database import ReadSession, WriteSession, open_write_session
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.attachments import service as attachments
from app.features.locations import service
from app.features.locations.schemas import (
    Location,
    LocationCreated,
    LocationMove,
    LocationMoved,
    LocationPhotoChanged,
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


@router.post(
    "/{location_id}/photo", operation_id="set_location_photo", responses=refusals(404, 422)
)
def set_location_photo(
    location_id: str, request: Request, settings: AppSettings, photo: Annotated[UploadFile, File()]
) -> LocationPhotoChanged:
    raw = photo.file.read(attachments.MAX_PHOTO_BYTES + 1)
    # The photo is stored before the write transaction starts, so the lock is held only briefly.
    with (
        attachments.saved_photo(settings, raw, photo.filename) as stored,
        open_write_session(request.app.state.engine) as session,
    ):
        return service.set_location_photo(session, location_id, stored, Actor.app, clock.now())


@router.delete(
    "/{location_id}/photo", operation_id="remove_location_photo", responses=refusals(404)
)
def remove_location_photo(location_id: str, session: WriteSession) -> LocationPhotoChanged:
    return service.remove_location_photo(session, location_id, Actor.app, clock.now())
