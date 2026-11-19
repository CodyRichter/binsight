from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile

from app.core import clock
from app.core.access import AppActor
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

router = APIRouter(prefix="/locations")
write_router = APIRouter(prefix="/locations")


@write_router.post(
    "", operation_id="create_location", status_code=201, responses=refusals(404, 422)
)
def create_location(body: NewLocation, session: WriteSession, actor: AppActor) -> LocationCreated:
    return service.create_location(session, body, actor, clock.now())


@router.get("", operation_id="list_locations")
def list_locations(session: ReadSession) -> LocationTree:
    return service.list_locations(session)


@router.get("/{location_id}", operation_id="get_location", responses=refusals(404))
def get_location(location_id: str, session: ReadSession) -> Location:
    return service.get_location(session, location_id)


@write_router.post(
    "/{location_id}/move", operation_id="move_location", responses=refusals(404, 409, 422)
)
def move_location(
    location_id: str, body: LocationMove, session: WriteSession, actor: AppActor
) -> LocationMoved:
    return service.move_location(session, location_id, body, actor, clock.now())


@write_router.post(
    "/{location_id}/photo", operation_id="set_location_photo", responses=refusals(404, 422)
)
def set_location_photo(
    location_id: str,
    request: Request,
    settings: AppSettings,
    photo: Annotated[UploadFile, File()],
    actor: AppActor,
) -> LocationPhotoChanged:
    raw = photo.file.read(attachments.MAX_PHOTO_BYTES + 1)
    # The photo is stored before the write transaction starts, so the lock is held only briefly.
    with (
        attachments.saved_photo(settings, raw, photo.filename) as stored,
        open_write_session(request.app.state.engine) as session,
    ):
        return service.set_location_photo(session, location_id, stored, actor, clock.now())


@write_router.delete(
    "/{location_id}/photo", operation_id="remove_location_photo", responses=refusals(404)
)
def remove_location_photo(
    location_id: str, session: WriteSession, actor: AppActor
) -> LocationPhotoChanged:
    return service.remove_location_photo(session, location_id, actor, clock.now())


@write_router.patch(
    "/{location_id}", operation_id="update_location", responses=refusals(404, 409, 422)
)
def update_location(
    location_id: str, body: LocationChanges, session: WriteSession, actor: AppActor
) -> LocationUpdated:
    return service.update_location(session, location_id, body, actor, clock.now())


@write_router.delete("/{location_id}", operation_id="delete_location", responses=refusals(404, 409))
def delete_location(
    location_id: str, session: WriteSession, actor: AppActor, move_contents_to: str | None = None
) -> LocationDeleted:
    delete = LocationDelete(move_contents_to=move_contents_to)
    return housekeeping.delete_location(session, location_id, delete, actor, clock.now())


@write_router.post(
    "/{location_id}/merge", operation_id="merge_location", responses=refusals(404, 409, 422)
)
def merge_location(
    location_id: str, body: LocationMerge, session: WriteSession, actor: AppActor
) -> LocationMerged:
    return housekeeping.merge_location(session, location_id, body, actor, clock.now())


@write_router.post(
    "/{location_id}/restore", operation_id="restore_location", responses=refusals(404, 409)
)
def restore_location(location_id: str, session: WriteSession, actor: AppActor) -> LocationRestored:
    return service.restore_location(session, location_id, actor, clock.now())


@write_router.post(
    "/{location_id}/reorder", operation_id="reorder_location", responses=refusals(404, 409, 422)
)
def reorder_location(
    location_id: str, body: LocationReorder, session: WriteSession, actor: AppActor
) -> LocationReordered:
    return service.reorder_location(session, location_id, body, actor, clock.now())
