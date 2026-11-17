from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.history import service
from app.features.history.schemas import HistoryEntry
from app.mcp.actions import run_action

LIST_HISTORY = """List the changes made to one item, newest first, a page at a time.

Use this to say when an item was added or last changed, and whether the owner (actor
"app") or Claude (actor "mcp") made the change. limit is 1 to 200 (50 if left out); when
next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}; each entry has its time, actor, action such
as item.created or item.updated, and each changed record's fields before and after."""


def add_history_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for reading an item's history."""

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
