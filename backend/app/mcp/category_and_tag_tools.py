from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.items import service
from app.features.items.schemas import Category, Tag
from app.mcp.actions import run_action

LIST_CATEGORIES = """List the categories items have, by name, a page at a time.

Use this before setting an item's category with update_item, so an existing name such as
"Cables" is reused rather than a near-duplicate made, and to answer what kinds of things
the owner keeps. Only categories at least one item has are listed. limit is 1 to 200 (50
if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [{"name": ..., "item_count": ...}], "next_cursor": ...}."""

LIST_TAGS = """List the tags items have, by name, a page at a time.

Use this before tagging an item with update_item, so the tags already in use, such as
"usb-c", are reused rather than spelled a new way. To find the items with a tag, pass the
tag to search_home. limit is 1 to 200 (50 if left out); when next_cursor is not null, pass
it as cursor for the next page.

Returns {"items": [{"name": ..., "item_count": ...}], "next_cursor": ...}."""


def add_category_and_tag_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the categories and tags in use, so it reuses their names."""

    @server.tool(description=LIST_CATEGORIES)
    async def list_categories(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[Category]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_categories(session, PageLimit(limit=limit).limit, cursor),
        )

    @server.tool(description=LIST_TAGS)
    async def list_tags(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[Tag]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_tags(session, PageLimit(limit=limit).limit, cursor),
        )
