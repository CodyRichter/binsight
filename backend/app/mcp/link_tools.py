from typing import Annotated, Literal

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.features.items import service
from app.features.items.schemas import ItemLinked, ItemLinkNew, ItemUnlinked, LinkedItem
from app.mcp.actions import run_action
from app.models import Actor, LinkKind

LINK_ITEMS = """Link two items: one belongs with the other, or is part of it.

Use "belongs_with" for things that go together, such as a drill and its charger; it means
the same whichever item is given first. Use "part_of" when item_id is a part of
other_item_id, such as a bit that is part of a bit set: the part is always item_id. Find
the items' identifiers with search_home first.

Returns the link_id and the history_entry_id, or the error same_item, already_linked,
part_cycle (the whole is already part of this part), item_not_found or item_deleted."""

UNLINK_ITEMS = """Remove a link between two items. Neither item is changed.

link_id comes from list_item_links. The removal can be undone with undo_history_entry.

Returns the history_entry_id, or the error link_not_found."""

LIST_ITEM_LINKS = """List the items linked to one item, a page at a time.

Use this to answer what goes with something, what it is part of, or what its parts are.
Each entry has the link_id, the kind from this item's side ("belongs_with"; "part_of",
this item is part of the linked one; or "part", the linked one is part of this item), and
the linked item with its path. Deleted items are left out. limit is 1 to 200 (50 if left
out); when next_cursor is not null, pass it as cursor for the next page.

Returns {"items": [{"link_id": ..., "kind": ..., "item": {...}}], "next_cursor": ...}."""


def add_link_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for linking items that belong together or are parts of a whole."""

    @server.tool(description=LINK_ITEMS)
    async def link_items(
        item_id: str, other_item_id: str, kind: Literal["belongs_with", "part_of"]
    ) -> Annotated[CallToolResult, ItemLinked]:
        link = ItemLinkNew(other_item_id=other_item_id, kind=LinkKind(kind))
        return await run_action(
            app,
            open_write_session,
            lambda session: service.link_items(session, item_id, link, Actor.mcp, clock.now()),
        )

    @server.tool(description=UNLINK_ITEMS)
    async def unlink_items(link_id: str) -> Annotated[CallToolResult, ItemUnlinked]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.unlink_items(session, link_id, Actor.mcp, clock.now()),
        )

    @server.tool(description=LIST_ITEM_LINKS)
    async def list_item_links(
        item_id: str, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[LinkedItem]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_item_links(
                session, item_id, PageLimit(limit=limit).limit, cursor
            ),
        )
