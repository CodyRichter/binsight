from typing import Annotated, Literal

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_write_session
from app.features.items import service
from app.features.items.schemas import (
    ItemFound,
    ItemMarkedFound,
    ItemMarkedMissing,
    ItemStatusChange,
    ItemStatusChanged,
)
from app.features.locations import service as locations
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
is now, which may be its old home, as a code such as K7Q-4MZ. The item's status
goes back to in_place and its home location becomes that place, as one change.

Returns the item with its new path and the history_entry_id, or the error not_missing,
location_not_found or item_deleted."""


CHANGE_ITEM_STATUS = """Set an item's status: in use, back in place, or retired to the archive.

Use this when the owner says they are using something ("in_use"), that it is back where it
belongs ("in_place"), or that it was sold, given away or thrown away ("sold", "given_away",
"thrown_away"). Retired items go to the archive: they keep their home location for the
record, no longer count among that location's contents, and stay findable with
search_home. The date they were retired is set to now. Lending has its own tools,
lend_item and return_item; a missing item comes back with mark_item_found, which asks
where it turned up.

Returns the item with its new status and the history_entry_id, or the error
status_unchanged, use_mark_found or item_deleted."""


def add_status_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for an item's status: missing and found, in use, or retired."""

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
                ItemFound(location_id=locations.location_code(location_id)),
                Actor.mcp,
                clock.now(),
            ),
        )

    @server.tool(description=CHANGE_ITEM_STATUS)
    async def change_item_status(
        item_id: str, status: Literal["in_place", "in_use", "sold", "given_away", "thrown_away"]
    ) -> Annotated[CallToolResult, ItemStatusChanged]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.change_item_status(
                session, item_id, ItemStatusChange(status=status), Actor.mcp, clock.now()
            ),
        )
