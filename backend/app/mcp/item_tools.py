from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.core.settings import Settings
from app.features.items import service
from app.features.items.schemas import (
    InboxCount,
    Item,
    ItemChanges,
    ItemCreated,
    ItemsCreated,
    ItemUpdated,
    NewItem,
    NewItems,
)
from app.features.locations import service as locations
from app.mcp.actions import run_action, run_photo_action
from app.models import MCP_ACTOR

CREATE_ITEM = """Add an item to the home by name.

Use this when the owner says they have something, or asks to add or put a thing somewhere.
home_location_id is where it lives: find it with list_locations, or give the code on the
label of the bin it goes in, such as K7Q-4MZ. Leave it out and the item
goes to the inbox, the items still waiting for a name or a home location. A new item has
quantity 1; change it afterwards with update_item.

Returns the new item with its path, the names from its location's site down to the
location, and the history_entry_id of the change."""

MAKE_OWN_ITEM = """Track a location itself as an item, such as a desk, a cabinet or a toolbox.

Use this when the owner wants to record what a piece of furniture or a container that holds
things is worth, or keep its receipt, serial number or warranty. location_id is the
location's code, such as K7Q-4MZ. The new item is named like the location, lives in it, and
gets a copy of its photo; it is the location's own item, not counted among its contents.
Fill in its price and other details afterwards with update_item. To make an item that
already exists a location's own item instead, give update_item own_item_of.

Returns the new item, or the error own_item_taken when the location already has one."""

LIST_ITEMS = """List the items in one location, oldest first, a page at a time.

Use this to answer what is in a location. location_id is the location's code,
such as K7Q-4MZ. With everything_inside set to true it also
includes the items in every location beneath it, such as every bin on a shelf. limit is
1 to 200 (50 if left out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}; each item has its quantity and its path."""

GET_ITEM = """Read one item by its identifier.

Use this to say where an item is: its path runs from the site down to its home location,
and an empty path means it is in the inbox.

Returns the item, or the error item_not_found."""

UPDATE_ITEM = """Change an item: its name, quantity, category, tags or other details.

changes holds only what to change; anything left out stays as it is:
- name: to name an item added by photo, or to correct a name. It cannot be cleared.
- quantity: when the owner used some up, bought more or counted them. It is the new total,
  a whole number of 0 or more, not the difference.
- category: the one kind of thing it is, by name, such as "Cables". A category is made
  the first time a name is used and matched ignoring case after that, so call
  list_categories first and reuse an existing name. null removes the category.
- tags: keywords such as "usb-c" or "18v". This is the whole list, replacing the old one,
  so to add a tag send the item's tags plus the new one. Tags are lower-cased; see
  list_tags for the ones in use. [] removes them all.
- notes, brand, model, serial_number: text. order_link: an http(s) address.
- purchase_date, warranty_ends, return_ends: dates as YYYY-MM-DD.
- price_cents: the price as a whole number of cents, so 24.99 is 2499.
- own_item_of: a location's code, to say this item is that location itself (a desk, a
  toolbox); the item moves into it. null says it is no longer. See make_own_item.
Every detail but name, quantity and tags is cleared by giving it as null. Search finds
items by brand, model, serial number, notes and tags as well as by name.

Returns the item as it is now, with the history_entry_id of the change, which
undo_history_entry takes to put it all back."""

ADD_ITEMS = """Add several items by name at once, all to the same place.

Use this when the owner lists several things that go in one bin or location, rather than
calling create_item for each. names is 1 to 100 names, kept in the order given;
home_location_id works as in create_item, and leaving it out puts them all in the inbox.
Each new item has quantity 1. The whole batch is one change: undo_history_entry with its
history_entry_id removes every item in it.

Returns {"items": [...], "history_entry_id": ...}, each item with its path."""

ADD_ITEM_BY_PHOTO = """Add an item from a photo, with no name.

Use this when the owner gives you a picture of something to keep track of and no name
for it, or asks for the photo itself to be kept. upload_id is an upload the photo was sent
to, a JPEG, PNG or WebP of at most 20 MB: see create_upload. home_location_id works as in
create_item. The
item has no name, so it waits in the inbox until it is named with update_item; if you
can tell what the photo shows, name it straight away.

Returns the new item with its photo_url and the history_entry_id, or the error
unsupported_photo, photo_too_large, upload_not_found, upload_not_sent or upload_expired."""

LIST_INBOX = """List the inbox, oldest first, a page at a time: items with no name or no home.

Use this when the owner asks what is still waiting to be sorted, or to find items added
by photo that need a name. limit is 1 to 200 (50 if left out); when next_cursor is not
null, pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}; each item has its path, empty when it has
no home location, and its photo_url."""

COUNT_INBOX = """Count the items in the inbox: those with no name or no home location.

Use this to say how many items are waiting to be sorted, without listing them.

Returns {"count": ...}."""


def add_item_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for adding, reading and changing items."""
    _add_reading_tools(server, app)
    _add_inbox_tools(server, app)
    _add_changing_tools(server, app)
    _add_adding_tools(server, app)


def _home(home_location_id: str | None) -> str | None:
    return locations.location_code(home_location_id) if home_location_id else None


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
                NewItem(name=name, home_location_id=_home(home_location_id)),
                MCP_ACTOR,
                clock.now(),
            ),
        )

    @server.tool(description=UPDATE_ITEM)
    async def update_item(
        item_id: str, changes: dict[str, object]
    ) -> Annotated[CallToolResult, ItemUpdated]:
        # Validated in the action, so a bad value is refused with the API's validation_failed.
        if isinstance(changes.get("own_item_of"), str):
            changes["own_item_of"] = locations.location_code(str(changes["own_item_of"]))
        return await run_action(
            app,
            open_write_session,
            lambda session: service.update_item(
                session, item_id, ItemChanges.model_validate(changes), MCP_ACTOR, clock.now()
            ),
        )


def _add_adding_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=ADD_ITEMS)
    async def add_items(
        names: list[str], home_location_id: str | None = None
    ) -> Annotated[CallToolResult, ItemsCreated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.create_items(
                session,
                NewItems(names=names, home_location_id=_home(home_location_id)),
                MCP_ACTOR,
                clock.now(),
            ),
        )

    @server.tool(description=ADD_ITEM_BY_PHOTO)
    async def add_item_by_photo(
        upload_id: str, home_location_id: str | None = None
    ) -> Annotated[CallToolResult, ItemCreated]:
        return await run_photo_action(
            app,
            upload_id,
            lambda session, photo: service.create_item_by_photo(
                session, photo, _home(home_location_id), MCP_ACTOR, clock.now()
            ),
        )

    @server.tool(description=MAKE_OWN_ITEM)
    async def make_own_item(location_id: str) -> Annotated[CallToolResult, ItemCreated]:
        settings: Settings = app.state.settings
        return await run_action(
            app,
            open_write_session,
            lambda session: service.make_own_item(
                session, settings, locations.location_code(location_id), MCP_ACTOR, clock.now()
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
                locations.location_code(location_id),
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


def _add_inbox_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=LIST_INBOX)
    async def list_inbox(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[Item]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_inbox(session, PageLimit(limit=limit).limit, cursor),
        )

    @server.tool(description=COUNT_INBOX)
    async def count_inbox() -> Annotated[CallToolResult, InboxCount]:
        return await run_action(app, open_read_session, service.count_inbox)
