from fastapi import APIRouter

from app.core import clock
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.features.items import service
from app.features.items.schemas import Item, ItemChanges, ItemCreated, ItemUpdated, NewItem
from app.models import Actor

router = APIRouter(prefix="/items")


@router.post("", operation_id="create_item", status_code=201, responses=refusals(404, 422))
def create_item(body: NewItem, session: WriteSession) -> ItemCreated:
    return service.create_item(session, body, Actor.app, clock.now())


@router.get("", operation_id="list_items", responses=refusals(400, 404, 422))
def list_items(
    session: ReadSession,
    location_id: str,
    everything_inside: bool = False,
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> Page[Item]:
    return service.list_items(session, location_id, everything_inside, limit, cursor)


@router.get("/{item_id}", operation_id="get_item", responses=refusals(404))
def get_item(item_id: str, session: ReadSession) -> Item:
    return service.get_item(session, item_id)


@router.patch("/{item_id}", operation_id="update_item", responses=refusals(404, 422))
def update_item(item_id: str, body: ItemChanges, session: WriteSession) -> ItemUpdated:
    return service.update_item(session, item_id, body, Actor.app, clock.now())
