from typing import Annotated

from fastapi import APIRouter, Query

from app.core import clock
from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit
from app.features.search import service
from app.features.search.schemas import Search, SearchResults

router = APIRouter(prefix="/search")


@router.get("", operation_id="search_home", responses=refusals(400, 404, 422))
def search_home(
    session: ReadSession,
    search: Annotated[Search, Query()],
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> SearchResults:
    return service.search_home(session, search, clock.now().date(), limit, cursor)
