from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.pagination import DEFAULT_LIMIT, PageLimit
from app.features.search import service
from app.features.search.schemas import SearchResults
from app.mcp.actions import run_action

SEARCH_HOME = """Search the whole home for items and locations by what they are called.

Use this first for "do we have a ...?" and "where is ...?". The query is matched word by
word in any order, finds a word from its first letters, and allows a typo or two in
longer words, so "hdmi cabel" and "cable hdmi" both find "HDMI cable". A label code works
too, in any case and with or without the hyphen: "b14" finds the location labelled B-014.
Location summaries are searched as well. An item added by photo and not yet named is not
found; see list_inbox. limit is 1 to 200 (50 if left out); when next_cursor is not null,
pass it as cursor for the next page.

Returns {"results": [...], "next_cursor": ..., "count": ...}, best match first. Each
result has kind "item", with the item and its full location path, or kind "location",
with the location, its label_code and how many items it holds; marks give the matched
parts of the name. Follow up with get_item, or list_items for what a location holds."""


def add_search_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for searching the home."""

    @server.tool(description=SEARCH_HOME)
    async def search_home(
        query: str, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, SearchResults]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.search_home(
                session, query, PageLimit(limit=limit).limit, cursor
            ),
        )
