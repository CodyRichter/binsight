from fastapi import APIRouter

from app.core import clock
from app.core.access import AppActor
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.history import service
from app.features.history.schemas import HistoryEntry, Undone

router = APIRouter(prefix="/history")
undo_router = APIRouter(prefix="/history")


@router.get("", operation_id="list_history", responses=refusals(400, 422))
def list_history(
    session: ReadSession, item_id: str, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[HistoryEntry]:
    return service.list_item_history(session, item_id, limit, cursor)


@undo_router.post(
    "/{entry_id}/undo", operation_id="undo_history_entry", responses=refusals(404, 409)
)
def undo_history_entry(
    entry_id: str, session: WriteSession, settings: AppSettings, actor: AppActor
) -> Undone:
    return service.undo(session, settings, entry_id, actor, clock.now())
