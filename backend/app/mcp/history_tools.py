from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.history import service
from app.features.history.schemas import HistoryEntry, Undone
from app.mcp.actions import run_action
from app.models import Actor

LIST_HISTORY = """List the changes made to one item, newest first, a page at a time.

Use this to say when an item was added or last changed, and whether the owner (actor
"app") or Claude (actor "mcp") made the change. limit is 1 to 200 (50 if left out); when
next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}; each entry has its time, actor, action such
as item.created or item.updated, and each changed record's fields before and after."""


UNDO_HISTORY_ENTRY = """Undo one change, putting back what it did.

Use this when the owner says a change was a mistake, or straight after you made one
yourself: entry_id is the history_entry_id the change returned, or an entry's id from
list_history. Adding an item, adding several or by photo, naming an item, changing its
quantity, moving an item or a location, deleting or restoring an item, marking an item
missing or found can be undone;
undoing an add removes what was added, and undoing a delete restores the item. The undo is
itself a new entry in history.

Returns {"history_entry_id": ..., "undone_entry_id": ...}, or the error
history_entry_not_found, already_undone, undo_not_supported, or changed_since when the
record has been changed again since."""


def add_history_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for reading an item's history and undoing a change."""

    @server.tool(description=UNDO_HISTORY_ENTRY)
    async def undo_history_entry(entry_id: str) -> Annotated[CallToolResult, Undone]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.undo(
                session, app.state.settings, entry_id, Actor.mcp, clock.now()
            ),
        )

    @server.tool(description=LIST_HISTORY)
    async def list_history(
        item_id: str, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[HistoryEntry]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_item_history(
                session, item_id, PageLimit(limit=limit).limit, cursor
            ),
        )
