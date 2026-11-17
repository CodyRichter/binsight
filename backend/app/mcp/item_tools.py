from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.items import service
from app.features.items.schemas import Item, ItemChanges, ItemCreated, ItemUpdated, NewItem
from app.features.labels import service as labels
from app.mcp.actions import run_action
from app.models import Actor

CREATE_ITEM = """Add an item to the home by name.

Use this when the owner says they have something, or asks to add or put a thing somewhere.
home_location_id is where it lives: find it with list_locations, or give the label code of
the bin it goes in, such as B-014. Leave it out and the item
goes to the inbox, the items still waiting for a name or a home location. A new item has
quantity 1; change it afterwards with update_item.

Returns the new item with its path, the names from its location's site down to the
location, and the history_entry_id of the change."""

LIST_ITEMS = """List the items in one location, oldest first, a page at a time.

Use this to answer what is in a location. location_id may be the location's label code,
such as B-014. With everything_inside set to true it also
includes the items in every location beneath it, such as every bin on a shelf. limit is
1 to 200 (50 if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}; each item has its quantity and its path."""

GET_ITEM = """Read one item by its identifier.

Use this to say where an item is: its path runs from the site down to its home location,
and an empty path means it is in the inbox.

Returns the item, or the error item_not_found."""

UPDATE_ITEM = """Change how many of an item there are.

Use this when the owner says they used some up, bought more, or counted them. quantity is
the new total, a whole number of 0 or more, not the difference.

Returns the item as it is now, with the history_entry_id of the change."""


def add_item_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for adding, reading and changing items."""
    _add_reading_tools(server, app)
    _add_changing_tools(server, app)


def _add_changing_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=CREATE_ITEM)
    async def create_item(
        name: str, home_location_id: str | None = None
    ) -> Annotated[CallToolResult, ItemCreated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.create_item(
                session,
                NewItem(
                    name=name,
                    home_location_id=(
                        labels.location_id_for(session, home_location_id)
                        if home_location_id
                        else None
                    ),
                ),
                Actor.mcp,
                clock.now(),
            ),
        )

    @server.tool(description=UPDATE_ITEM)
    async def update_item(item_id: str, quantity: int) -> Annotated[CallToolResult, ItemUpdated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.update_item(
                session, item_id, ItemChanges(quantity=quantity), Actor.mcp, clock.now()
            ),
        )


def _add_reading_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=LIST_ITEMS)
    async def list_items(
        location_id: str,
        everything_inside: bool = False,
        limit: int = DEFAULT_LIMIT,
        cursor: str | None = None,
    ) -> Annotated[CallToolResult, Page[Item]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_items(
                session,
                labels.location_id_for(session, location_id),
                everything_inside,
                PageLimit(limit=limit).limit,
                cursor,
            ),
        )

    @server.tool(description=GET_ITEM)
    async def get_item(item_id: str) -> Annotated[CallToolResult, Item]:
        return await run_action(
            app, open_read_session, lambda session: service.get_item(session, item_id)
        )
