from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile

from app.core import clock
from app.core.database import ReadSession, WriteSession, open_write_session
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.attachments import service as attachments
from app.features.locations import housekeeping, service
from app.features.locations.schemas import (
    Location,
    LocationChanges,
    LocationCreated,
    LocationDelete,
    LocationDeleted,
    LocationMerge,
    LocationMerged,
    LocationMove,
    LocationMoved,
    LocationPhotoChanged,
    LocationReorder,
    LocationReordered,
    LocationRestored,
    LocationTree,
    LocationUpdated,
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


@router.patch("/{location_id}", operation_id="update_location", responses=refusals(404, 409, 422))
def update_location(
    location_id: str, body: LocationChanges, session: WriteSession
) -> LocationUpdated:
    return service.update_location(session, location_id, body, Actor.app, clock.now())


@router.delete("/{location_id}", operation_id="delete_location", responses=refusals(404, 409))
def delete_location(
    location_id: str, session: WriteSession, move_contents_to: str | None = None
) -> LocationDeleted:
    delete = LocationDelete(move_contents_to=move_contents_to)
    return housekeeping.delete_location(session, location_id, delete, Actor.app, clock.now())


@router.post(
    "/{location_id}/merge", operation_id="merge_location", responses=refusals(404, 409, 422)
)
def merge_location(location_id: str, body: LocationMerge, session: WriteSession) -> LocationMerged:
    return housekeeping.merge_location(session, location_id, body, Actor.app, clock.now())


@router.post(
    "/{location_id}/restore", operation_id="restore_location", responses=refusals(404, 409)
)
def restore_location(location_id: str, session: WriteSession) -> LocationRestored:
    return service.restore_location(session, location_id, Actor.app, clock.now())


@router.post(
    "/{location_id}/reorder", operation_id="reorder_location", responses=refusals(404, 409, 422)
)
def reorder_location(
    location_id: str, body: LocationReorder, session: WriteSession
) -> LocationReordered:
    return service.reorder_location(session, location_id, body, Actor.app, clock.now())
