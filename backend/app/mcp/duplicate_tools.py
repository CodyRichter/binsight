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
from app.features.items.schemas import ItemCreated, ItemMerge, ItemMerged, MergePreview
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import MCP_ACTOR

DUPLICATE_ITEM = """Add a copy of an item beside it, to record a similar thing quickly.

Use this when the owner has another thing like one already recorded, such as a second
drill of the same model. The copy keeps the name, home location, category, tags, brand,
model, notes, purchase date, price, order link and warranty and return dates. It gets
quantity 1 and none of the serial number, photos, files, links or status, which belong to
the original. Rename it afterwards with update_item if the owner says how it differs.

Returns the new item with its path and the history_entry_id, which undo_history_entry takes
to remove the copy. Refusals: item_not_found and item_deleted."""

MERGE_ITEM = """Merge one item into another, in two calls: a preview, then the merge.

Use this when two items are really the same thing recorded twice, as the possible
duplicates view lists. item_id is folded into into: its quantity is added to into's, its
tags join into's, any detail into lacks (category, notes, brand, serial number, dates,
price) is filled from it, and its photos, files and links move across. Then item_id is
deleted. Call it first without a confirmation_token: nothing changes, and it returns
{"preview": {"item", "into", "confirmation_token", "expires_at"}, "merged": null}. Tell the
owner which item will be folded into which and ask them. Only when they agree, call it
again with the same inputs and the token, which works once and expires after ten minutes.

The second call returns {"preview": null, "merged": item}, the item merged into as it is
now, with the history_entry_id, which undo_history_entry takes to separate them again.
Refusals: same_item, item_not_found, item_deleted, confirmation_invalid and
confirmation_expired."""


class MergePreviewWithToken(MergePreview):
    confirmation_token: str
    expires_at: datetime


class MergeItemAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the item merged into."""

    preview: MergePreviewWithToken | None
    merged: ItemMerged | None


def _merge(session: Session, item_id: str, into: str, token: str | None) -> MergeItemAnswer:
    merge = ItemMerge(into=into)
    inputs: dict[str, str | None] = {"item_id": item_id, "into": into}
    if token is None:
        found = service.preview_merge_item(session, item_id, merge)
        issued = confirmation.issue(session, "merge_item", inputs, clock.now())
        preview = MergePreviewWithToken(
            **found.model_dump(), confirmation_token=issued.token, expires_at=issued.expires_at
        )
        return MergeItemAnswer(preview=preview, merged=None)
    now = clock.now()
    confirmation.redeem(session, "merge_item", inputs, token, now)
    merged = service.merge_item(session, item_id, merge, MCP_ACTOR, now)
    return MergeItemAnswer(preview=None, merged=merged)


def add_duplicate_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for copying an item and for merging one recorded twice."""

    @server.tool(description=DUPLICATE_ITEM)
    async def duplicate_item(item_id: str) -> Annotated[CallToolResult, ItemCreated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.duplicate_item(session, item_id, MCP_ACTOR, clock.now()),
        )

    @server.tool(description=MERGE_ITEM)
    async def merge_item(
        item_id: str, into: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, MergeItemAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _merge(session, item_id, into, confirmation_token),
        )
