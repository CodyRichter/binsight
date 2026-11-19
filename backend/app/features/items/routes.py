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
    Category,
    InboxCount,
    Item,
    ItemChanges,
    ItemCreated,
    ItemDeleted,
    ItemFound,
    ItemLending,
    ItemLent,
    ItemLinked,
    ItemLinkNew,
    ItemMarkedFound,
    ItemMarkedMissing,
    ItemMerge,
    ItemMerged,
    ItemMove,
    ItemMoved,
    ItemRestored,
    ItemReturned,
    ItemsCreated,
    ItemStatusChange,
    ItemStatusChanged,
    ItemUnlinked,
    ItemUpdated,
    LentToName,
    LinkedItem,
    NewItem,
    NewItems,
    Tag,
)
from app.models import Actor

router = APIRouter(prefix="/items")
# Categories, tags and links exist only on items, so items owns them, at their own addresses.
categories_and_tags_router = APIRouter()


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


@router.get("/lent-to-names", operation_id="list_lent_to_names", responses=refusals(400, 422))
def list_lent_to_names(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[LentToName]:
    return service.list_lent_to_names(session, limit, cursor)


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


@router.post(
    "/{item_id}/duplicate",
    operation_id="duplicate_item",
    status_code=201,
    responses=refusals(404, 409),
)
def duplicate_item(item_id: str, session: WriteSession) -> ItemCreated:
    return service.duplicate_item(session, item_id, Actor.app, clock.now())


@router.post("/{item_id}/merge", operation_id="merge_item", responses=refusals(404, 409, 422))
def merge_item(item_id: str, body: ItemMerge, session: WriteSession) -> ItemMerged:
    return service.merge_item(session, item_id, body, Actor.app, clock.now())


@router.post("/{item_id}/restore", operation_id="restore_item", responses=refusals(404, 409))
def restore_item(item_id: str, session: WriteSession) -> ItemRestored:
    return service.restore_item(session, item_id, Actor.app, clock.now())


@router.post(
    "/{item_id}/mark-missing", operation_id="mark_item_missing", responses=refusals(404, 409)
)
def mark_item_missing(item_id: str, session: WriteSession) -> ItemMarkedMissing:
    return service.mark_item_missing(session, item_id, Actor.app, clock.now())


@router.post(
    "/{item_id}/mark-found", operation_id="mark_item_found", responses=refusals(404, 409, 422)
)
def mark_item_found(item_id: str, body: ItemFound, session: WriteSession) -> ItemMarkedFound:
    return service.mark_item_found(session, item_id, body, Actor.app, clock.now())


@router.post(
    "/{item_id}/status", operation_id="change_item_status", responses=refusals(404, 409, 422)
)
def change_item_status(
    item_id: str, body: ItemStatusChange, session: WriteSession
) -> ItemStatusChanged:
    return service.change_item_status(session, item_id, body, Actor.app, clock.now())


@router.post("/{item_id}/lend", operation_id="lend_item", responses=refusals(404, 409, 422))
def lend_item(item_id: str, body: ItemLending, session: WriteSession) -> ItemLent:
    return service.lend_item(session, item_id, body, Actor.app, clock.now())


@router.post("/{item_id}/return", operation_id="return_item", responses=refusals(404, 409))
def return_item(item_id: str, session: WriteSession) -> ItemReturned:
    return service.return_item(session, item_id, Actor.app, clock.now())


@router.get("/{item_id}/links", operation_id="list_item_links", responses=refusals(400, 404, 422))
def list_item_links(
    item_id: str, session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[LinkedItem]:
    return service.list_item_links(session, item_id, limit, cursor)


@router.post(
    "/{item_id}/links",
    operation_id="link_items",
    status_code=201,
    responses=refusals(404, 409, 422),
)
def link_items(item_id: str, body: ItemLinkNew, session: WriteSession) -> ItemLinked:
    return service.link_items(session, item_id, body, Actor.app, clock.now())


@categories_and_tags_router.delete(
    "/item-links/{link_id}", operation_id="unlink_items", responses=refusals(404)
)
def unlink_items(link_id: str, session: WriteSession) -> ItemUnlinked:
    return service.unlink_items(session, link_id, Actor.app, clock.now())


@categories_and_tags_router.get(
    "/categories", operation_id="list_categories", responses=refusals(400, 422)
)
def list_categories(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Category]:
    return service.list_categories(session, limit, cursor)


@categories_and_tags_router.get("/tags", operation_id="list_tags", responses=refusals(400, 422))
def list_tags(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Tag]:
    return service.list_tags(session, limit, cursor)
