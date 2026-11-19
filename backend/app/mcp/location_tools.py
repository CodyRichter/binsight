from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.features.locations import service
from app.features.locations import service as locations
from app.features.locations.schemas import Location, LocationCreated, LocationTree, NewLocation
from app.mcp.actions import run_action
from app.models import Actor, LocationType

CREATE_LOCATION = """Add a location to the home: a site, or a place inside another location.

Use this when the owner names a new room, shelf, bin, drawer or box. A site is the top of
a tree and has no parent_id; every other type needs the parent_id of the location it sits
in, which list_locations gives, or the code on its label. summary is an optional
one-line description.

Returns the new location with its path from the site down, its item counts, and the
history_entry_id of the change."""

LIST_LOCATIONS = """List every location in the home, as one flat list covering the whole tree.

Use this to find a location's identifier from its name, or to see what is inside what:
each location has its parent_id and its path, the names from its site down to itself.
Sibling names can repeat, so pick by path when two match.

Returns {"locations": [...]}, each with direct_item_count (items directly in it) and
item_count (items in it and every location beneath it)."""

GET_LOCATION = """Read one location by its code, such as K7Q-4MZ, as printed on its label.

Use this to get a location's path and how many items it holds. To see the items
themselves, call list_items with its identifier.

Returns the location, or the error location_not_found."""


def add_location_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for creating and reading locations."""

    @server.tool(description=CREATE_LOCATION)
    async def create_location(
        name: str, type: LocationType, parent_id: str | None = None, summary: str | None = None
    ) -> Annotated[CallToolResult, LocationCreated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.create_location(
                session,
                NewLocation(
                    name=name,
                    type=type,
                    parent_id=locations.location_code(parent_id) if parent_id else None,
                    summary=summary,
                ),
                Actor.mcp,
                clock.now(),
            ),
        )

    @server.tool(description=LIST_LOCATIONS)
    async def list_locations() -> Annotated[CallToolResult, LocationTree]:
        return await run_action(app, open_read_session, service.list_locations)

    @server.tool(description=GET_LOCATION)
    async def get_location(location_id: str) -> Annotated[CallToolResult, Location]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.get_location(session, locations.location_code(location_id)),
        )
