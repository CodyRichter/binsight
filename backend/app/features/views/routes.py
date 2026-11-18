from fastapi import APIRouter

from app.core import clock
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.features.search.service import SearchResults
from app.features.views import service
from app.features.views.schemas import (
    NewSavedSearch,
    SavedSearch,
    SavedSearchChanges,
    SavedSearchCreated,
    SavedSearchDeleted,
    SavedSearchUpdated,
    ViewName,
    ViewRow,
    ViewSummary,
)
from app.models import Actor

router = APIRouter(prefix="/views")
saved_searches_router = APIRouter(prefix="/saved-searches")


@router.get("", operation_id="list_views", responses=refusals(400, 422))
def list_views(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[ViewSummary]:
    return service.list_views(session, clock.now(), limit, cursor)


@router.get("/{view}", operation_id="list_view_rows", responses=refusals(400, 422))
def list_view_rows(
    view: ViewName, session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[ViewRow]:
    return service.list_view_rows(session, view, clock.now(), limit, cursor)


@saved_searches_router.get("", operation_id="list_saved_searches", responses=refusals(400, 422))
def list_saved_searches(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[SavedSearch]:
    return service.list_saved_searches(session, clock.now(), limit, cursor)


@saved_searches_router.post(
    "", operation_id="create_saved_search", status_code=201, responses=refusals(404, 422)
)
def create_saved_search(body: NewSavedSearch, session: WriteSession) -> SavedSearchCreated:
    return service.create_saved_search(session, body, Actor.app, clock.now())


@saved_searches_router.get(
    "/{saved_search_id}", operation_id="get_saved_search", responses=refusals(404)
)
def get_saved_search(saved_search_id: str, session: ReadSession) -> SavedSearch:
    return service.get_saved_search(session, saved_search_id, clock.now())


@saved_searches_router.patch(
    "/{saved_search_id}", operation_id="update_saved_search", responses=refusals(404, 409, 422)
)
def update_saved_search(
    saved_search_id: str, body: SavedSearchChanges, session: WriteSession
) -> SavedSearchUpdated:
    return service.update_saved_search(session, saved_search_id, body, Actor.app, clock.now())


@saved_searches_router.delete(
    "/{saved_search_id}", operation_id="delete_saved_search", responses=refusals(404)
)
def delete_saved_search(saved_search_id: str, session: WriteSession) -> SavedSearchDeleted:
    return service.delete_saved_search(session, saved_search_id, Actor.app, clock.now())


@saved_searches_router.get(
    "/{saved_search_id}/results",
    operation_id="list_saved_search_rows",
    responses=refusals(400, 404, 422),
)
def list_saved_search_rows(
    saved_search_id: str,
    session: ReadSession,
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> SearchResults:
    return service.list_saved_search_rows(session, saved_search_id, clock.now(), limit, cursor)
