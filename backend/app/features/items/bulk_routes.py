from fastapi import APIRouter

from app.core import clock
from app.core.database import WriteSession
from app.core.errors import refusals
from app.features.items import service
from app.features.items.bulk_schemas import (
    ItemsCategory,
    ItemsChanged,
    ItemsMove,
    ItemsStatus,
    ItemsTag,
)
from app.models import Actor

# Changing many items at once: /items/bulk/move would also read as moving an item called "bulk",
# so this router is included before the one for single items.
router = APIRouter(prefix="/items/bulk")


@router.post("/move", operation_id="move_items", responses=refusals(404, 409, 422))
def move_items(body: ItemsMove, session: WriteSession) -> ItemsChanged:
    return service.move_items(session, body, Actor.app, clock.now())


@router.post("/tag", operation_id="tag_items", responses=refusals(404, 409, 422))
def tag_items(body: ItemsTag, session: WriteSession) -> ItemsChanged:
    return service.tag_items(session, body, Actor.app, clock.now())


@router.post("/category", operation_id="change_items_category", responses=refusals(404, 409, 422))
def change_items_category(body: ItemsCategory, session: WriteSession) -> ItemsChanged:
    return service.change_items_category(session, body, Actor.app, clock.now())


@router.post("/status", operation_id="change_items_status", responses=refusals(404, 409, 422))
def change_items_status(body: ItemsStatus, session: WriteSession) -> ItemsChanged:
    return service.change_items_status(session, body, Actor.app, clock.now())
