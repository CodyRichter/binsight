from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.items import service
from app.features.items.schemas import (
    ItemLending,
    ItemLent,
    ItemReturned,
    LentToName,
)
from app.mcp.actions import run_action
from app.models import MCP_ACTOR

LEND_ITEM = """Lend an item to someone, by name.

Use this when the owner says they lent something out, or lent it on to someone else.
lent_to is just the person's name, free text, such as "Sam"; call list_lent_to_names first
to reuse the spelling used before. The status becomes lent_out and the item keeps its home
location, so it is clear where it goes back to. Archived items can't be lent.

Returns the item with lent_to, lent_at and the history_entry_id, or the error
item_archived or item_deleted."""

RETURN_ITEM = """Mark a lent-out item returned.

Use this when the owner says they got something back. The status goes back to in_place
and lent_to is cleared; the loan stays in the item's history.

Returns the item and the history_entry_id, or the error not_lent or item_deleted."""

LIST_LENT_TO_NAMES = """List the names items have been lent to before, most recent first.

Use this before lend_item so a person's name is spelled as it was last time. limit is 1
to 200 (50 if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [{"name": ...}], "next_cursor": ...}."""


def add_lending_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for lending an item and getting it back."""

    @server.tool(description=LEND_ITEM)
    async def lend_item(item_id: str, lent_to: str) -> Annotated[CallToolResult, ItemLent]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.lend_item(
                session, item_id, ItemLending(lent_to=lent_to), MCP_ACTOR, clock.now()
            ),
        )

    @server.tool(description=RETURN_ITEM)
    async def return_item(item_id: str) -> Annotated[CallToolResult, ItemReturned]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.return_item(session, item_id, MCP_ACTOR, clock.now()),
        )

    @server.tool(description=LIST_LENT_TO_NAMES)
    async def list_lent_to_names(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[LentToName]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_lent_to_names(
                session, PageLimit(limit=limit).limit, cursor
            ),
        )
