from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.views import service
from app.features.views.schemas import ViewName, ViewRow, ViewSummary
from app.mcp.actions import run_action

LIST_VIEWS = """List the built-in views across the whole home, each with how many it lists.

The views are lent-out, missing, warranty-ending (warranty ends in the next 30 days),
return-closing (return window ends in the next 30 days), recently-added and
recently-moved (the last 30 days), not-checked (locations holding items whose contents
were never checked or not in over a year), possible-duplicates (items sharing a name,
ignoring case) and archive (sold, given away or thrown away). Use it for "what needs
attention?" or to give the counts at a glance; run one with list_view_rows. limit is 1 to
200 (50 if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [{"view": ..., "title": ..., "count": ...}], "next_cursor": ...}."""

LIST_VIEW_ROWS = """Run one built-in view: list what it holds, a page at a time.

Use this for questions such as "what's lent out?", "what's missing?", "which warranties
end soon?", "what did I add or move lately?", "which bins haven't been checked in ages?",
"do I have duplicates?" and "what did I sell?". view is one of the names list_views gives.
Every view but archive leaves out archived items. lent-out lists the newest loan first,
with lent_to and lent_at; the warranty and return views list the soonest date first;
not-checked lists the longest unchecked first. limit is 1 to 200 (50 if left out); when
next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}. Each row has kind "item", with the item and
its full location path, or, in not-checked only, kind "location", with the location, its
last_checked_at and how many items it holds."""


def add_view_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for running the built-in views across the whole home."""

    @server.tool(description=LIST_VIEWS)
    async def list_views(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[ViewSummary]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_views(
                session, clock.now(), PageLimit(limit=limit).limit, cursor
            ),
        )

    @server.tool(description=LIST_VIEW_ROWS)
    async def list_view_rows(
        view: ViewName, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[ViewRow]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_view_rows(
                session, view, clock.now(), PageLimit(limit=limit).limit, cursor
            ),
        )
