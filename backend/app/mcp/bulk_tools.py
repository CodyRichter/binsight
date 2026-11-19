from collections.abc import Callable
from datetime import datetime
from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_write_session
from app.features.items import service
from app.features.items.bulk_schemas import (
    ItemsCategory,
    ItemsChanged,
    ItemsDelete,
    ItemsLend,
    ItemsMove,
    ItemsStatus,
    ItemsTag,
)
from app.features.items.schemas import Item
from app.features.locations import service as locations
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import Actor

TWO_CALLS = """Call it first without a confirmation_token: nothing changes, and it returns
{"preview": {"items": [...], "confirmation_token", "expires_at"}, "changed": null}, listing
with their paths only the items that would change; those already so are left out. Tell the
owner which items will change and ask them. Only when they agree, call it again with the
same inputs and the token, which works once and expires after ten minutes. item_ids holds
1 to 500 item identifiers; one unknown or deleted item refuses the whole batch.

The second call returns {"preview": null, "changed": {"items": [...], "history_entry_id"}},
and undo_history_entry with that id reverses the whole batch in one step. Refusals also
include confirmation_invalid and confirmation_expired, after which you ask again."""

MOVE_ITEMS = f"""Move many items into one location at once, in two calls: a preview, then the move.

Use this when the owner wants several things moved together, such as everything on a list
going into one bin; for one item use move_item. location_id is the destination's code,
such as K7Q-4MZ. Refused with already_there when every item is already there, and
location_deleted when the destination is deleted.

{TWO_CALLS}"""

TAG_ITEMS = f"""Add one tag to many items at once, in two calls: a preview, then the tagging.

Use this when the owner wants several items tagged alike, such as "camping"; their other
tags stay. For one item use update_item. Refused with already_tagged when every item
already has the tag.

{TWO_CALLS}"""

CHANGE_ITEMS_CATEGORY = f"""Give many items one category, or clear theirs, in two calls.

Use this when the owner recategorizes several items together. category is a category's
name, made if new and matched ignoring case, or null to take their category away. For one
item use update_item. Refused with category_unchanged when every item already has it.

{TWO_CALLS}"""

CHANGE_ITEMS_STATUS = f"""Give many items one status at once, in two calls.

Use this when the owner says several things are in use, back in place, or sold, given away
or thrown away (the archive). status is in_place, in_use, sold, given_away or thrown_away;
lending has lend_items, and marking missing or found goes one item at a time. Refused
with status_unchanged when every item already has it, and use_mark_found when putting a
missing item back in place, which mark_item_found does with where it was found.

{TWO_CALLS}"""


LEND_ITEMS = f"""Lend many items to one person at once, in two calls.

Use this when the owner lends several things together, such as camping gear to a friend;
for one item use lend_item. lent_to is the person's name; list_lent_to_names gives names
used before. Each item keeps its home location to come back to. Refused with
status_unchanged when every item is already lent to them, and item_archived when one is
in the archive.

{TWO_CALLS}"""

DELETE_ITEMS = f"""Delete many items at once, in two calls: a preview, then the delete.

Use this when the owner says several things are gone from the inventory, such as clearing
out a bin they emptied; for one item use delete_item. Deleted items leave every list and
search, and undo_history_entry brings them all back.

{TWO_CALLS}"""


class BulkPreview(BaseModel):
    items: list[Item]
    confirmation_token: str
    expires_at: datetime


class BulkAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or what the second changed."""

    preview: BulkPreview | None
    changed: ItemsChanged | None


def _in_two_calls[Body: BaseModel](
    session: Session,
    tool: str,
    body: Body,
    steps: tuple[
        Callable[[Session, Body], list[Item]],
        Callable[[Session, Body, Actor, datetime], ItemsChanged],
    ],
    token: str | None,
) -> BulkAnswer:
    preview, act = steps
    now = clock.now()
    inputs = body.model_dump(mode="json")
    if token is None:
        items = preview(session, body)
        issued = confirmation.issue(session, tool, inputs, now)
        found = BulkPreview(
            items=items, confirmation_token=issued.token, expires_at=issued.expires_at
        )
        return BulkAnswer(preview=found, changed=None)
    confirmation.redeem(session, tool, inputs, token, now)
    return BulkAnswer(preview=None, changed=act(session, body, Actor.mcp, now))


def _move(session: Session, item_ids: list[str], location: str, token: str | None) -> BulkAnswer:
    move = ItemsMove(item_ids=item_ids, location_id=locations.location_code(location))
    steps = (service.preview_move_items, service.move_items)
    return _in_two_calls(session, "move_items", move, steps, token)


def _add_move_and_tag_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=MOVE_ITEMS)
    async def move_items(
        item_ids: list[str], location_id: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _move(session, item_ids, location_id, confirmation_token),
        )

    @server.tool(description=TAG_ITEMS)
    async def tag_items(
        item_ids: list[str], tag: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        steps = (service.preview_tag_items, service.tag_items)
        return await run_action(
            app,
            open_write_session,
            lambda session: _in_two_calls(
                session,
                "tag_items",
                ItemsTag(item_ids=item_ids, tag=tag),
                steps,
                confirmation_token,
            ),
        )


def _add_category_and_status_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=CHANGE_ITEMS_CATEGORY)
    async def change_items_category(
        item_ids: list[str], category: str | None, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        steps = (service.preview_change_items_category, service.change_items_category)
        return await run_action(
            app,
            open_write_session,
            lambda session: _in_two_calls(
                session,
                "change_items_category",
                ItemsCategory(item_ids=item_ids, category=category),
                steps,
                confirmation_token,
            ),
        )

    @server.tool(description=CHANGE_ITEMS_STATUS)
    async def change_items_status(
        item_ids: list[str], status: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        steps = (service.preview_change_items_status, service.change_items_status)
        return await run_action(
            app,
            open_write_session,
            lambda session: _in_two_calls(
                session,
                "change_items_status",
                ItemsStatus.model_validate({"item_ids": item_ids, "status": status}),
                steps,
                confirmation_token,
            ),
        )


def _add_lend_and_delete_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=LEND_ITEMS)
    async def lend_items(
        item_ids: list[str], lent_to: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        steps = (service.preview_lend_items, service.lend_items)
        return await run_action(
            app,
            open_write_session,
            lambda session: _in_two_calls(
                session,
                "lend_items",
                ItemsLend(item_ids=item_ids, lent_to=lent_to),
                steps,
                confirmation_token,
            ),
        )

    @server.tool(description=DELETE_ITEMS)
    async def delete_items(
        item_ids: list[str], confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, BulkAnswer]:
        steps = (service.preview_delete_items, service.delete_items)
        return await run_action(
            app,
            open_write_session,
            lambda session: _in_two_calls(
                session, "delete_items", ItemsDelete(item_ids=item_ids), steps, confirmation_token
            ),
        )


def add_bulk_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude bulk edit: moving, tagging, recategorizing, restatusing, lending or deleting."""
    _add_move_and_tag_tools(server, app)
    _add_category_and_status_tools(server, app)
    _add_lend_and_delete_tools(server, app)
