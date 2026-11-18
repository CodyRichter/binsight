from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.attachments.service import Attachment
from app.features.items import service as items
from app.features.items.schemas import AttachmentAdded, NewWebLink
from app.features.labels import service as labels
from app.features.locations import service as locations
from app.features.locations.schemas import LocationPhotoChanged
from app.mcp.actions import run_action, run_file_action, run_file_reading_action, run_photo_action
from app.mcp.removal_answers import (
    RemoveItemAttachmentAnswer,
    RemoveLocationPhotoAnswer,
    remove_item_attachment_in_two_calls,
    remove_location_photo_in_two_calls,
)
from app.models import Actor

GET_ATTACHMENT_FILE = """Look at a photo, or read a file such as a receipt or a manual.

Use this to see what an item is, especially one added by photo that has no name yet, or to
read a file attached to an item. attachment_id comes from list_item_attachments, or from a
photo_url or file_url, which end in /api/attachments/{attachment_id}/file. A web link has no
file: open its url instead.

Returns a photo or image file as an image, a PDF as an embedded application/pdf resource,
or the error attachment_not_found."""

LIST_ITEM_ATTACHMENTS = """List an item's photos, files and web links, photos first.

Use this to find an item's receipt, manual or warranty document, which are told apart by
their filename. limit is 1 to 200 (50 if left out); when next_cursor is not null, pass it
as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}. Each has its kind (photo, file or link),
filename, url (links only), content_type, size in bytes, and file_url (photos and files)."""

ADD_ITEM_PHOTO = """Add a photo to an item that already exists.

photo_base64 is a JPEG, PNG or WebP as base64 text, at most 20 MB. It is stored upright, as
JPEG, without its metadata. The item's first photo stays its picture.

Returns the new attachment with the history_entry_id, which undo_history_entry takes to
remove it again, or unsupported_photo, photo_too_large, item_not_found or item_deleted."""

ATTACH_FILE = """Attach a file to an item, such as its receipt, manual or warranty document.

Use this when the owner hands over a receipt or a manual for something they have.
file_base64 is a PDF, JPEG, PNG or WebP as base64 text, at most 50 MB, kept exactly as
sent. filename is what it is shown as, such as "Drill receipt.pdf"; since files have no
other type, name it so the owner can tell a receipt from a manual.

Returns the new attachment with the history_entry_id, or unsupported_file,
file_too_large, item_not_found or item_deleted."""

ATTACH_WEB_LINK = """Attach a web link to an item, such as its manual's page or where it was bought.

url is an http(s) address. name is optional, such as "Manual"; without one, the address
itself is shown.

Returns the new attachment with the history_entry_id, or item_not_found or item_deleted."""

REMOVE_ITEM_ATTACHMENT = """Take a photo, file or web link off an item, in two calls.

Call it first with item_id and attachment_id alone: nothing is removed, and it returns
{"preview": {"attachment": ..., "confirmation_token": ..., "expires_at": ...},
"removed": null}. Tell the owner what will be removed and ask them. Only when they agree,
call it again with the same inputs and the confirmation_token, which works once and expires
after ten minutes.

The second call returns {"preview": null, "removed": attachment} with the
history_entry_id, which undo_history_entry takes to put it back. Either call refuses with
photo_names_item when it is the only photo of an item that has no name yet: name the item
with update_item first."""

SET_LOCATION_PHOTO = """Give a location its photo, so it is easy to recognize, replacing any it had.

location_id may be the location's label code, such as B-014. photo_base64 is a JPEG, PNG or
WebP as base64 text, at most 20 MB.

Returns the location with its photo_url and the history_entry_id; undoing it puts the old
photo back. Refuses with unsupported_photo, photo_too_large or location_not_found."""

REMOVE_LOCATION_PHOTO = """Take a location's photo away, in two calls.

Call it first with location_id alone (a label code works too): nothing is removed, and it
returns {"preview": {"location": ..., "confirmation_token": ..., "expires_at": ...},
"removed": null}. Ask the owner; only when they agree, call it again with the same
location_id and the confirmation_token.

The second call returns {"preview": null, "removed": location} with the history_entry_id,
which undo_history_entry takes to put the photo back. Refuses with attachment_not_found
when the location has no photo."""


def _location(session: Session, location_id: str) -> str:
    return labels.location_id_for(session, location_id)


def _add_reading_tools(server: MCPServer, app: FastAPI) -> None:
    settings: Settings = app.state.settings

    @server.tool(description=GET_ATTACHMENT_FILE)
    async def get_attachment_file(attachment_id: str) -> CallToolResult:
        return await run_file_reading_action(
            app, lambda session: attachments.attachment_file(session, settings, attachment_id)
        )

    @server.tool(description=LIST_ITEM_ATTACHMENTS)
    async def list_item_attachments(
        item_id: str, limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[Attachment]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: items.list_item_attachments(
                session, item_id, PageLimit(limit=limit).limit, cursor
            ),
        )


def _add_item_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=ADD_ITEM_PHOTO)
    async def add_item_photo(
        item_id: str, photo_base64: str
    ) -> Annotated[CallToolResult, AttachmentAdded]:
        return await run_photo_action(
            app,
            photo_base64,
            lambda session, photo: items.add_item_photo(
                session, item_id, photo, Actor.mcp, clock.now()
            ),
        )

    @server.tool(description=ATTACH_FILE)
    async def attach_file(
        item_id: str, file_base64: str, filename: str
    ) -> Annotated[CallToolResult, AttachmentAdded]:
        return await run_file_action(
            app,
            (file_base64, filename),
            lambda session, file: items.attach_file(session, item_id, file, Actor.mcp, clock.now()),
        )

    @server.tool(description=ATTACH_WEB_LINK)
    async def attach_web_link(
        item_id: str, url: str, name: str | None = None
    ) -> Annotated[CallToolResult, AttachmentAdded]:
        return await run_action(
            app,
            open_write_session,
            lambda session: items.attach_web_link(
                session, item_id, NewWebLink(url=url, name=name), Actor.mcp, clock.now()
            ),
        )


def _add_location_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=SET_LOCATION_PHOTO)
    async def set_location_photo(
        location_id: str, photo_base64: str
    ) -> Annotated[CallToolResult, LocationPhotoChanged]:
        return await run_photo_action(
            app,
            photo_base64,
            lambda session, photo: locations.set_location_photo(
                session, _location(session, location_id), photo, Actor.mcp, clock.now()
            ),
        )


def _add_removal_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=REMOVE_ITEM_ATTACHMENT)
    async def remove_item_attachment(
        item_id: str, attachment_id: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, RemoveItemAttachmentAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: remove_item_attachment_in_two_calls(
                session, item_id, attachment_id, confirmation_token
            ),
        )

    @server.tool(description=REMOVE_LOCATION_PHOTO)
    async def remove_location_photo(
        location_id: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, RemoveLocationPhotoAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: remove_location_photo_in_two_calls(
                session, _location(session, location_id), confirmation_token
            ),
        )


def add_attachment_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for photos, files and web links on items, and location photos."""
    _add_reading_tools(server, app)
    _add_item_tools(server, app)
    _add_location_tools(server, app)
    _add_removal_tools(server, app)
