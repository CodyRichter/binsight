from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_write_session
from app.features.items import service
from app.features.items.schemas import ItemFound, ItemMarkedFound, ItemMarkedMissing
from app.features.labels import service as labels
from app.mcp.actions import run_action
from app.models import Actor

MARK_ITEM_MISSING = """Mark an item missing: it is not where Binsight says it is.

Use this when the owner looked for something and it was not there. The item keeps its
home location, so it still shows where it belongs, with the status missing. When it turns
up, use mark_item_found.

Returns the item with status "missing" and the history_entry_id, or the error
already_missing or item_deleted."""

MARK_ITEM_FOUND = """Mark a missing item found, in the location where it turned up.

Use this when the owner finds something that was marked missing. location_id is where it
is now, which may be its old home; a label code such as B-014 works too. The item's status
goes back to in_place and its home location becomes that place, as one change.

Returns the item with its new path and the history_entry_id, or the error not_missing,
location_not_found or item_deleted."""


def add_status_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for marking an item missing and found."""

    @server.tool(description=MARK_ITEM_MISSING)
    async def mark_item_missing(item_id: str) -> Annotated[CallToolResult, ItemMarkedMissing]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.mark_item_missing(session, item_id, Actor.mcp, clock.now()),
        )

    @server.tool(description=MARK_ITEM_FOUND)
    async def mark_item_found(
        item_id: str, location_id: str
    ) -> Annotated[CallToolResult, ItemMarkedFound]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.mark_item_found(
                session,
                item_id,
                ItemFound(location_id=labels.location_id_for(session, location_id)),
                Actor.mcp,
                clock.now(),
            ),
        )
