from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session
from app.core.pagination import DEFAULT_LIMIT, PageLimit
from app.features.items.service import ItemFilters
from app.features.locations import service as locations
from app.features.search import service
from app.features.search.schemas import Search, SearchResults
from app.mcp.actions import run_action

SEARCH_HOME = """Search the whole home for items and locations by what they are called.

Use this first for "do we have a ...?" and "where is ...?". The query is matched word by
word in any order, finds a word from its first letters, and allows a typo or two in
longer words, so "hdmi cabel" and "cable hdmi" both find "HDMI cable". A location's code works
too, in any case and with or without the hyphen: "k7q4mz" finds the location K7Q-4MZ.
Location summaries are searched as well. An item added by photo and not yet named is not
found; see list_inbox.

filters keeps only the items that match every filter given: location_id (that location and
everything inside it, by its code), category (its name), tag, status (in_place,
in_use, lent_out, missing, sold, given_away, thrown_away) and warranty ("active",
"ending_soon" within 30 days, or "ended"). Locations are left out when any filter but
location_id is given. With filters, query may be empty to list every item they keep, by
name: {"category": "Cables"} with no query is "all cables". For lent out, missing,
warranties ending and the like, list_view_rows answers directly. limit is 1 to 200 (50 if
left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"results": [...], "next_cursor": ..., "count": ...}, best match first. Each
result has kind "item", with the item and its full location path, or kind "location",
with the location, its id (the code on its label) and how many items it holds; marks give
the matched parts of the name. Follow up with get_item, or list_items for what a location holds."""


def _search(query: str, filters: ItemFilters | None) -> Search:
    kept = filters or ItemFilters()
    if kept.location_id is not None:
        location_id = locations.location_code(kept.location_id)
        kept = kept.model_copy(update={"location_id": location_id})
    return Search(query=query, **kept.model_dump())


def add_search_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for searching the home."""

    @server.tool(description=SEARCH_HOME)
    async def search_home(
        query: str = "",
        filters: ItemFilters | None = None,
        limit: int = DEFAULT_LIMIT,
        cursor: str | None = None,
    ) -> Annotated[CallToolResult, SearchResults]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.search_home(
                session,
                _search(query, filters),
                clock.now().date(),
                PageLimit(limit=limit).limit,
                cursor,
            ),
        )
