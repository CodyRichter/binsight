from typing import Annotated

from fastapi import APIRouter, Query

from app.core.database import ReadSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit
from app.features.search import service
from app.features.search.schemas import SearchResults

router = APIRouter(prefix="/search")

SearchQuery = Annotated[str, Query(max_length=200)]


@router.get("", operation_id="search_home", responses=refusals(400, 422))
def search_home(
    session: ReadSession,
    q: SearchQuery = "",
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> SearchResults:
    return service.search_home(session, q, limit, cursor)
