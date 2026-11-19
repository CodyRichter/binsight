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
from app.features.items.schemas import Item, ItemDeleted, ItemRestored
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import MCP_ACTOR

DELETE_ITEM = """Delete an item, in two calls: first a preview, then the deletion.

Use this when the owner asks to delete or get rid of an item's record. Call it first with
item_id alone: nothing is deleted, and it returns {"preview": {"item": ...,
"confirmation_token": ..., "expires_at": ...}, "deleted": null}. Tell the owner which item
will be deleted, with its path, and ask them. Only when they agree, call it again with the
same item_id and the confirmation_token. A token works once, only for that item, and
expires after ten minutes. A deleted item leaves every list and search, and can be brought
back with restore_item.

The second call returns {"preview": null, "deleted": item}, the item with its deleted_at
and history_entry_id, or the error confirmation_invalid or confirmation_expired, after
which you ask again from the first call. Either call refuses with item_deleted if the item
is already deleted."""

RESTORE_ITEM = """Bring a deleted item back, in the location it was deleted from.

Use this when the owner wants back an item that was deleted, or straight after deleting
the wrong one. No confirmation is needed.

Returns the item with deleted_at null and the history_entry_id, or the error not_deleted
when the item was never deleted."""


class DeletePreview(BaseModel):
    item: Item
    confirmation_token: str
    expires_at: datetime


class DeleteItemAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the item the second deleted."""

    preview: DeletePreview | None
    deleted: ItemDeleted | None


def _delete(session: Session, item_id: str, token: str | None) -> DeleteItemAnswer:
    now = clock.now()
    inputs = {"item_id": item_id}
    if token is None:
        item = service.preview_delete_item(session, item_id)
        issued = confirmation.issue(session, "delete_item", inputs, now)
        preview = DeletePreview(
            item=item, confirmation_token=issued.token, expires_at=issued.expires_at
        )
        return DeleteItemAnswer(preview=preview, deleted=None)
    confirmation.redeem(session, "delete_item", inputs, token, now)
    deleted = service.delete_item(session, item_id, MCP_ACTOR, now)
    return DeleteItemAnswer(preview=None, deleted=deleted)


def add_delete_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for deleting an item, after the owner confirms, and restoring it."""

    @server.tool(description=DELETE_ITEM)
    async def delete_item(
        item_id: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, DeleteItemAnswer]:
        return await run_action(
            app, open_write_session, lambda session: _delete(session, item_id, confirmation_token)
        )

    @server.tool(description=RESTORE_ITEM)
    async def restore_item(item_id: str) -> Annotated[CallToolResult, ItemRestored]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.restore_item(session, item_id, MCP_ACTOR, clock.now()),
        )
