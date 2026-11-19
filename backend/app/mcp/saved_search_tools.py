from datetime import datetime
from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.items.service import ItemFilters
from app.features.locations import service as locations
from app.features.search.service import SearchResults
from app.features.views import service
from app.features.views.schemas import (
    NewSavedSearch,
    SavedSearch,
    SavedSearchChanges,
    SavedSearchCreated,
    SavedSearchDeleted,
    SavedSearchUpdated,
)
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import Actor

LIST_SAVED_SEARCHES = """List the owner's saved searches, pinned ones first, then by name.

Each has its id, name, pinned, the query and filters it runs (as search_home takes them),
and count, how many results it finds now. Run one with list_saved_search_rows. limit is 1
to 200 (50 if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}."""

GET_SAVED_SEARCH = """Get one saved search: its name, query, filters, pinned and count."""

LIST_SAVED_SEARCH_ROWS = """Run a saved search: what it finds now, best match first.

Returns the same shape as search_home, or the error saved_search_not_found."""

CREATE_SAVED_SEARCH = """Save a search under a name, so the owner can run it again or pin it.

Use this when the owner asks to keep a search, such as "save all my cables" (no query and
filters {"category": "Cables"}). query and filters are as search_home takes them; a
location_id is a location's code. It starts unpinned; pin it with update_saved_search.

Returns the saved search with its count and the history_entry_id."""

UPDATE_SAVED_SEARCH = """Rename a saved search, or pin or unpin it.

Give name, pinned, or both. Pinned searches are listed first and shown in the app's
navigation. To change what it searches for, delete it and save a new one.

Returns the saved search and the history_entry_id, or the error nothing_changed or
saved_search_not_found."""

DELETE_SAVED_SEARCH = """Delete a saved search, in two calls: first a preview, then the deletion.

Call it first with saved_search_id alone: nothing is deleted, and it returns {"preview":
{"saved_search": ..., "confirmation_token": ..., "expires_at": ...}, "deleted": null}. Ask
the owner, and only when they agree, call it again with the confirmation_token. No item is
changed; the deletion can be undone with undo_history_entry.

The second call returns {"preview": null, "deleted": {"history_entry_id": ...}}, or the
error confirmation_invalid or confirmation_expired."""


class DeleteSavedSearchPreview(BaseModel):
    saved_search: SavedSearch
    confirmation_token: str
    expires_at: datetime


class DeleteSavedSearchAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the deletion from the second."""

    preview: DeleteSavedSearchPreview | None
    deleted: SavedSearchDeleted | None


def _delete(session: Session, saved_search_id: str, token: str | None) -> DeleteSavedSearchAnswer:
    now = clock.now()
    inputs = {"saved_search_id": saved_search_id}
    if token is None:
        shown = service.get_saved_search(session, saved_search_id, now)
        issued = confirmation.issue(session, "delete_saved_search", inputs, now)
        preview = DeleteSavedSearchPreview(
            saved_search=shown, confirmation_token=issued.token, expires_at=issued.expires_at
        )
        return DeleteSavedSearchAnswer(preview=preview, deleted=None)
    confirmation.redeem(session, "delete_saved_search", inputs, token, now)
    deleted = service.delete_saved_search(session, saved_search_id, Actor.mcp, now)
    return DeleteSavedSearchAnswer(preview=None, deleted=deleted)


def _create(
    session: Session, name: str, query: str, filters: ItemFilters | None
) -> SavedSearchCreated:
    kept = filters or ItemFilters()
    if kept.location_id is not None:
        kept = kept.model_copy(update={"location_id": locations.location_code(kept.location_id)})
    new = NewSavedSearch(name=name, query=query, **kept.model_dump())
    return service.create_saved_search(session, new, Actor.mcp, clock.now())


def _add_reading_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=LIST_SAVED_SEARCHES)
    async def list_saved_searches(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[SavedSearch]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_saved_searches(
                session, clock.now(), PageLimit(limit=limit).limit, cursor
            ),
        )

    @server.tool(description=GET_SAVED_SEARCH)
    async def get_saved_search(saved_search_id: str) -> Annotated[CallToolResult, SavedSearch]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.get_saved_search(session, saved_search_id, clock.now()),
        )

    @server.tool(description=LIST_SAVED_SEARCH_ROWS)
    async def list_saved_search_rows(
        saved_search_id: str, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, SearchResults]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_saved_search_rows(
                session, saved_search_id, clock.now(), PageLimit(limit=limit).limit, cursor
            ),
        )


def add_saved_search_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for saving, pinning, running and deleting saved searches."""
    _add_reading_tools(server, app)

    @server.tool(description=CREATE_SAVED_SEARCH)
    async def create_saved_search(
        name: str, query: str = "", filters: ItemFilters | None = None
    ) -> Annotated[CallToolResult, SavedSearchCreated]:
        return await run_action(
            app, open_write_session, lambda session: _create(session, name, query, filters)
        )

    @server.tool(description=UPDATE_SAVED_SEARCH)
    async def update_saved_search(
        saved_search_id: str, name: str | None = None, pinned: bool | None = None
    ) -> Annotated[CallToolResult, SavedSearchUpdated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.update_saved_search(
                session,
                saved_search_id,
                SavedSearchChanges(name=name, pinned=pinned),
                Actor.mcp,
                clock.now(),
            ),
        )

    @server.tool(description=DELETE_SAVED_SEARCH)
    async def delete_saved_search(
        saved_search_id: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, DeleteSavedSearchAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _delete(session, saved_search_id, confirmation_token),
        )
