from fastapi import APIRouter

from app.core import clock
from app.core.access import AppActor, IsVisitor
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.features.items import service as items
from app.features.items.service import Item
from app.features.search import service as search
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
    ViewSummary,
)

router = APIRouter(prefix="/views")
saved_searches_router = APIRouter(prefix="/saved-searches")
saved_search_changes_router = APIRouter(prefix="/saved-searches")


@router.get("", operation_id="list_views", responses=refusals(400, 422))
def list_views(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[ViewSummary]:
    return service.list_views(session, clock.now(), limit, cursor)


@router.get("/{view}", operation_id="list_view_rows", responses=refusals(400, 422))
def list_view_rows(
    view: ViewName,
    session: ReadSession,
    visitor: IsVisitor,
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> Page[Item]:
    rows = service.list_view_rows(session, view, clock.now(), limit, cursor)
    return items.page_for(rows, visitor)


@saved_searches_router.get("", operation_id="list_saved_searches", responses=refusals(400, 422))
def list_saved_searches(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[SavedSearch]:
    return service.list_saved_searches(session, clock.now(), limit, cursor)


@saved_search_changes_router.post(
    "", operation_id="create_saved_search", status_code=201, responses=refusals(404, 422)
)
def create_saved_search(
    body: NewSavedSearch, session: WriteSession, actor: AppActor
) -> SavedSearchCreated:
    return service.create_saved_search(session, body, actor, clock.now())


@saved_searches_router.get(
    "/{saved_search_id}", operation_id="get_saved_search", responses=refusals(404)
)
def get_saved_search(saved_search_id: str, session: ReadSession) -> SavedSearch:
    return service.get_saved_search(session, saved_search_id, clock.now())


@saved_search_changes_router.patch(
    "/{saved_search_id}", operation_id="update_saved_search", responses=refusals(404, 409, 422)
)
def update_saved_search(
    saved_search_id: str, body: SavedSearchChanges, session: WriteSession, actor: AppActor
) -> SavedSearchUpdated:
    return service.update_saved_search(session, saved_search_id, body, actor, clock.now())


@saved_search_changes_router.delete(
    "/{saved_search_id}", operation_id="delete_saved_search", responses=refusals(404)
)
def delete_saved_search(
    saved_search_id: str, session: WriteSession, actor: AppActor
) -> SavedSearchDeleted:
    return service.delete_saved_search(session, saved_search_id, actor, clock.now())


@saved_searches_router.get(
    "/{saved_search_id}/results",
    operation_id="list_saved_search_rows",
    responses=refusals(400, 404, 422),
)
def list_saved_search_rows(
    saved_search_id: str,
    session: ReadSession,
    visitor: IsVisitor,
    limit: Limit = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> SearchResults:
    rows = service.list_saved_search_rows(session, saved_search_id, clock.now(), limit, cursor)
    return search.results_for(rows, visitor)
