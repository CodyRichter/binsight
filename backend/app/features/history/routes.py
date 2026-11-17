from fastapi import APIRouter

from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.features.history import service
from app.features.history.schemas import HistoryEntry

router = APIRouter(prefix="/history")


@router.get("", operation_id="list_history", responses=refusals(400, 422))
def list_history(
    session: ReadSession, item_id: str, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[HistoryEntry]:
    return service.list_item_history(session, item_id, limit, cursor)
