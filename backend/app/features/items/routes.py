from typing import Annotated

from fastapi import APIRouter, File, Form, Request, UploadFile

from app.core import clock
from app.core.database import ReadSession, WriteSession, open_write_session
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.attachments import service as attachments
from app.features.items import service
from app.features.items.schemas import (
    InboxCount,
    Item,
    ItemChanges,
    ItemCreated,
    ItemDeleted,
    ItemMove,
    ItemMoved,
    ItemRestored,
    ItemsCreated,
    ItemUpdated,
    NewItem,
    NewItems,
)
from app.models import Actor

router = APIRouter(prefix="/items")


@router.post("", operation_id="create_item", status_code=201, responses=refusals(404, 422))
def create_item(body: NewItem, session: WriteSession) -> ItemCreated:
    return service.create_item(session, body, Actor.app, clock.now())


@router.post(
    "/add-several", operation_id="add_items", status_code=201, responses=refusals(404, 422)
)
def add_items(body: NewItems, session: WriteSession) -> ItemsCreated:
    return service.create_items(session, body, Actor.app, clock.now())


@router.post(
    "/add-by-photo", operation_id="add_item_by_photo", status_code=201, responses=refusals(404, 422)
)
def add_item_by_photo(
    request: Request,
    settings: AppSettings,
    photo: Annotated[UploadFile, File()],
    home_location_id: Annotated[str | None, Form()] = None,
) -> ItemCreated:
    raw = photo.file.read(attachments.MAX_PHOTO_BYTES + 1)
    # The photo is stored before the write transaction starts, so the lock is held only briefly.
    with (
        attachments.saved_photo(settings, raw, photo.filename) as stored,
        open_write_session(request.app.state.engine) as session,
    ):
        return service.create_item_by_photo(
            session, stored, home_location_id, Actor.app, clock.now()
        )


@router.get("", operation_id="list_items", responses=refusals(400, 404, 422))
def list_items(
    session: ReadSession,
    location_id: str,
    everything_inside: bool = False,
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> Page[Item]:
    return service.list_items(session, location_id, everything_inside, limit, cursor)


@router.get("/inbox", operation_id="list_inbox", responses=refusals(400, 422))
def list_inbox(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Item]:
    return service.list_inbox(session, limit, cursor)


@router.get("/inbox/count", operation_id="count_inbox")
def count_inbox(session: ReadSession) -> InboxCount:
    return service.count_inbox(session)


@router.get("/{item_id}", operation_id="get_item", responses=refusals(404))
def get_item(item_id: str, session: ReadSession) -> Item:
    return service.get_item(session, item_id)


@router.patch("/{item_id}", operation_id="update_item", responses=refusals(404, 422))
def update_item(item_id: str, body: ItemChanges, session: WriteSession) -> ItemUpdated:
    return service.update_item(session, item_id, body, Actor.app, clock.now())


@router.post("/{item_id}/move", operation_id="move_item", responses=refusals(404, 409, 422))
def move_item(item_id: str, body: ItemMove, session: WriteSession) -> ItemMoved:
    return service.move_item(session, item_id, body, Actor.app, clock.now())


@router.delete("/{item_id}", operation_id="delete_item", responses=refusals(404, 409))
def delete_item(item_id: str, session: WriteSession) -> ItemDeleted:
    return service.delete_item(session, item_id, Actor.app, clock.now())


@router.post("/{item_id}/restore", operation_id="restore_item", responses=refusals(404, 409))
def restore_item(item_id: str, session: WriteSession) -> ItemRestored:
    return service.restore_item(session, item_id, Actor.app, clock.now())
