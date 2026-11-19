from datetime import datetime
from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_write_session
from app.features.labels import service as labels
from app.features.locations import housekeeping, service
from app.features.locations.schemas import (
    LocationChanges,
    LocationDelete,
    LocationDeleted,
    LocationMerge,
    LocationMerged,
    LocationReorder,
    LocationReordered,
    LocationRestored,
    LocationUpdated,
    RemovalPreview,
)
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import Actor

UPDATE_LOCATION = """Rename a location, or change or clear its one-line summary.

Use this when the owner renames a room, shelf or bin, or describes what a bin holds
("spare network cables"). location_id is its identifier or its label's code. Pass only what
changes: name to rename it, summary to change it, or clear_summary true to remove it.

Returns the location with its path and the history_entry_id, which undo_history_entry takes
to put the old name or summary back."""

DELETE_LOCATION = """Delete a location, in two calls: first a preview, then the deletion.

Use this when the owner wants a location gone. A location is never deleted with things in
it: pass move_contents_to, a location's identifier or label code, and its items and the
locations directly inside it move there first. Leave it out only for an empty location.
Call it first without a confirmation_token: nothing changes, and it returns {"preview":
{"location", "destination", "items_moving", "locations_moving", "confirmation_token",
"expires_at"}, "deleted": null}. Tell the owner what will move where and ask them. Only
when they agree, call it again with the same inputs and the token, which works once and
expires after ten minutes. Its label stays on it, and scanning the label offers to restore.

The second call returns {"preview": null, "deleted": location} with deleted_at and the
history_entry_id, which undo_history_entry takes to put everything back. Refusals:
location_has_contents, move_into_itself, location_deleted, confirmation_invalid and
confirmation_expired."""

MERGE_LOCATION = """Merge one location into another, in two calls: a preview, then the merge.

Use this when two locations are really the same place, such as two entries for one shelf.
Everything in location_id moves into into: its items, the locations inside it and its
checks. Its label moves too, if into has none. Then location_id is deleted. Both accept a
label code. Call it first without a confirmation_token, tell the owner what will move, and
only when they agree call it again with the same inputs and the token (once, ten minutes).

The first call returns {"preview": {...}, "merged": null}; the second {"preview": null,
"merged": location}, the location merged into with its new counts and the
history_entry_id, which undo_history_entry takes to separate them again. Refusals:
move_into_itself, location_deleted, confirmation_invalid and confirmation_expired."""

RESTORE_LOCATION = """Bring a deleted location back, empty, where it was in the tree.

Use this when the owner wants back a location that was deleted, often after scanning its
label. What was in it stays where it was moved; move it back with move_item and
move_location if asked. No confirmation is needed.

Returns the location with deleted_at null and the history_entry_id, or not_deleted, or
parent_deleted when the location it sat in is deleted too and must be restored first."""

REORDER_LOCATION = """Change where a location comes among the locations beside it.

Use this when the owner wants a different order, such as shelves top to bottom. position
counts from 0 among the locations in the same parent (or among the sites); a number past
the end puts it last. list_locations lists siblings in their order.

Returns the location and the history_entry_id, or already_there when nothing moves."""


class RemovalPreviewWithToken(RemovalPreview):
    confirmation_token: str
    expires_at: datetime


class DeleteLocationAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the location the second deleted."""

    preview: RemovalPreviewWithToken | None
    deleted: LocationDeleted | None


class MergeLocationAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the location merged into."""

    preview: RemovalPreviewWithToken | None
    merged: LocationMerged | None


def _location(session: Session, location: str) -> str:
    return labels.location_id_for(session, location)


def _preview(
    session: Session, tool: str, inputs: dict[str, str | None], destination_id: str | None
) -> RemovalPreviewWithToken:
    found = housekeeping.preview_removal(session, str(inputs["location_id"]), destination_id)
    issued = confirmation.issue(session, tool, inputs, clock.now())
    return RemovalPreviewWithToken(
        **found.model_dump(), confirmation_token=issued.token, expires_at=issued.expires_at
    )


def _delete(
    session: Session, location: str, move_contents_to: str | None, token: str | None
) -> DeleteLocationAnswer:
    location_id = _location(session, location)
    destination_id = _location(session, move_contents_to) if move_contents_to else None
    inputs = {"location_id": location_id, "move_contents_to": destination_id}
    if token is None:
        preview = _preview(session, "delete_location", inputs, destination_id)
        return DeleteLocationAnswer(preview=preview, deleted=None)
    now = clock.now()
    confirmation.redeem(session, "delete_location", inputs, token, now)
    delete = LocationDelete(move_contents_to=destination_id)
    deleted = housekeeping.delete_location(session, location_id, delete, Actor.mcp, now)
    return DeleteLocationAnswer(preview=None, deleted=deleted)


def _merge(session: Session, location: str, into: str, token: str | None) -> MergeLocationAnswer:
    location_id, into_id = _location(session, location), _location(session, into)
    inputs: dict[str, str | None] = {"location_id": location_id, "into": into_id}
    if token is None:
        return MergeLocationAnswer(
            preview=_preview(session, "merge_location", inputs, into_id), merged=None
        )
    now = clock.now()
    confirmation.redeem(session, "merge_location", inputs, token, now)
    merge = LocationMerge(into=into_id)
    merged = housekeeping.merge_location(session, location_id, merge, Actor.mcp, now)
    return MergeLocationAnswer(preview=None, merged=merged)


def _changes(name: str | None, summary: str | None, clear_summary: bool) -> LocationChanges:
    sent: dict[str, str | None] = {} if name is None else {"name": name}
    if clear_summary or summary is not None:
        sent["summary"] = None if clear_summary else summary
    return LocationChanges.model_validate(sent)


def _add_removal_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=DELETE_LOCATION)
    async def delete_location(
        location_id: str,
        move_contents_to: str | None = None,
        confirmation_token: str | None = None,
    ) -> Annotated[CallToolResult, DeleteLocationAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _delete(session, location_id, move_contents_to, confirmation_token),
        )

    @server.tool(description=MERGE_LOCATION)
    async def merge_location(
        location_id: str, into: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, MergeLocationAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _merge(session, location_id, into, confirmation_token),
        )


def _add_update_tool(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=UPDATE_LOCATION)
    async def update_location(
        location_id: str,
        name: str | None = None,
        summary: str | None = None,
        clear_summary: bool = False,
    ) -> Annotated[CallToolResult, LocationUpdated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.update_location(
                session,
                _location(session, location_id),
                _changes(name, summary, clear_summary),
                Actor.mcp,
                clock.now(),
            ),
        )


def add_location_housekeeping_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for renaming, deleting, merging, restoring and ordering locations."""
    _add_removal_tools(server, app)
    _add_update_tool(server, app)

    @server.tool(description=RESTORE_LOCATION)
    async def restore_location(location_id: str) -> Annotated[CallToolResult, LocationRestored]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.restore_location(
                session, _location(session, location_id), Actor.mcp, clock.now()
            ),
        )

    @server.tool(description=REORDER_LOCATION)
    async def reorder_location(
        location_id: str, position: int
    ) -> Annotated[CallToolResult, LocationReordered]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.reorder_location(
                session,
                _location(session, location_id),
                LocationReorder(position=position),
                Actor.mcp,
                clock.now(),
            ),
        )
