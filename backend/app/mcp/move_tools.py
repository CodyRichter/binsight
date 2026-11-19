from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_write_session
from app.features.items import service as items
from app.features.items.schemas import ItemMove, ItemMoved
from app.features.locations import service as locations
from app.features.locations.schemas import LocationMove, LocationMoved
from app.mcp.actions import run_action
from app.models import MCP_ACTOR

MOVE_ITEM = """Move an item into another location.

Use this when the owner says they put something somewhere else, or asks to move it. Find
item_id with search_home. location_id is where it goes now: its code from
list_locations or search_home, or the code on the bin's label, such as K7Q-4MZ.

Returns the item with its new full path and the history_entry_id of the move, which
undo_history_entry reverses. Refused with already_there when it is already in that
location, and item_not_found or location_not_found for an unknown identifier."""

MOVE_LOCATION = """Move a location, with everything inside it, into another location.

Use this when the owner moves a bin to another shelf, a shelf to another room, and so on.
Every item and location inside it moves with it; none of them is changed individually.
location_id and parent_id are each a location's code, such as K7Q-4MZ.

Returns the location with its new path and the history_entry_id of the move, which
undo_history_entry reverses in one step. Refused with move_into_itself when parent_id is
the location or anything inside it, site_cannot_move for a site, and already_there when it
is already in that parent."""


def add_move_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for moving items and locations."""

    @server.tool(description=MOVE_ITEM)
    async def move_item(item_id: str, location_id: str) -> Annotated[CallToolResult, ItemMoved]:
        return await run_action(
            app,
            open_write_session,
            lambda session: items.move_item(
                session,
                item_id,
                ItemMove(location_id=locations.location_code(location_id)),
                MCP_ACTOR,
                clock.now(),
            ),
        )

    @server.tool(description=MOVE_LOCATION)
    async def move_location(
        location_id: str, parent_id: str
    ) -> Annotated[CallToolResult, LocationMoved]:
        return await run_action(
            app,
            open_write_session,
            lambda session: locations.move_location(
                session,
                locations.location_code(location_id),
                LocationMove(parent_id=locations.location_code(parent_id)),
                MCP_ACTOR,
                clock.now(),
            ),
        )
