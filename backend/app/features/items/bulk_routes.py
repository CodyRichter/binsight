from fastapi import APIRouter

from app.core import clock
from app.core.access import AppActor
from app.core.database import WriteSession
from app.core.errors import refusals
from app.features.items import service
from app.features.items.bulk_schemas import (
    ItemsCategory,
    ItemsChanged,
    ItemsDelete,
    ItemsLend,
    ItemsMove,
    ItemsStatus,
    ItemsTag,
)

# Changing many items at once: /items/bulk/move would also read as moving an item called "bulk",
# so this router is included before the one for single items.
router = APIRouter(prefix="/items/bulk")


@router.post("/move", operation_id="move_items", responses=refusals(404, 409, 422))
def move_items(body: ItemsMove, session: WriteSession, actor: AppActor) -> ItemsChanged:
    return service.move_items(session, body, actor, clock.now())


@router.post("/tag", operation_id="tag_items", responses=refusals(404, 409, 422))
def tag_items(body: ItemsTag, session: WriteSession, actor: AppActor) -> ItemsChanged:
    return service.tag_items(session, body, actor, clock.now())


@router.post("/category", operation_id="change_items_category", responses=refusals(404, 409, 422))
def change_items_category(
    body: ItemsCategory, session: WriteSession, actor: AppActor
) -> ItemsChanged:
    return service.change_items_category(session, body, actor, clock.now())


@router.post("/status", operation_id="change_items_status", responses=refusals(404, 409, 422))
def change_items_status(body: ItemsStatus, session: WriteSession, actor: AppActor) -> ItemsChanged:
    return service.change_items_status(session, body, actor, clock.now())


@router.post("/lend", operation_id="lend_items", responses=refusals(404, 409, 422))
def lend_items(body: ItemsLend, session: WriteSession, actor: AppActor) -> ItemsChanged:
    return service.lend_items(session, body, actor, clock.now())


@router.post("/delete", operation_id="delete_items", responses=refusals(404, 409, 422))
def delete_items(body: ItemsDelete, session: WriteSession, actor: AppActor) -> ItemsChanged:
    return service.delete_items(session, body, actor, clock.now())
