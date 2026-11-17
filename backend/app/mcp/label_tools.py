from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.pagination import DEFAULT_LIMIT, Page, PageLimit
from app.core.settings import Settings
from app.features.labels import service
from app.features.labels.schemas import (
    BlankLabelsCreated,
    Label,
    LabelClaim,
    LabelClaimed,
    LabelUnclaimed,
    NewBlankLabels,
)
from app.mcp.actions import run_action, run_image_action
from app.models import Actor

CREATE_BLANK_LABELS = """Make a batch of blank labels to print and stick on bins before use.

Use this when the owner wants labels to print ahead of time. count is 1 to 100. Codes
continue the one series (B-001, B-002, ...) and are never reused. Each label is blank
until claim_label attaches it to a location; get_label_image gives the image to print.

Returns {"labels": [...]}, each with its code, and the history_entry_id of the change."""

LIST_LABELS = """List every label, blank or claimed, newest code first, a page at a time.

Use this to find blank labels still to be claimed (location_id is null) or the code a
location's label has. limit is 1 to 200 (50 if left out); when next_cursor is not null,
pass it as cursor for the next page.

Returns {"items": [...], "next_cursor": ...}."""

GET_LABEL = """Read one label by its code.

Use this when the owner gives a code, such as B-014, to learn which location it is on.
Case and the hyphen do not matter: b14 is B-014. A location_id of null means the label
is blank and can be claimed. To see what is in the location, pass the code straight to
list_items or get_location, which accept it in place of an identifier.

Returns the label, or the error label_not_found."""

CLAIM_LABEL = """Attach a blank label to a location, as scanning it for the first time does.

Use this when the owner says a blank label went on a bin, drawer, shelf or any other
location. location_id may also be another label's code. To put it on a new location,
call create_location first. A label goes on one location, and a location has one label.

Returns the label with its location_id, the history_entry_id of the change, or the error
label_already_claimed, location_has_label, label_not_found or location_not_found."""

UNCLAIM_LABEL = """Turn a claimed label back into a blank label, to undo a claim made by mistake.

Use this when the owner says a label was claimed for the wrong location, right after
claim_label. The location stays; only the label comes off it, and it can then be claimed
again. Do not use it to move a label: codes are permanent once they are in real use.

Returns the blank label, the history_entry_id of the change, or the error
label_not_claimed or label_not_found."""

GET_LABEL_IMAGE = """Draw a label as a PNG to print: its QR code with its code beneath.

Use this when the owner wants to print a label, or reprint a damaged one; the code and
address never change, so a reprint replaces the old sticker exactly.

Returns the image, or the error label_not_found."""


def _app_address(app: FastAPI) -> str:
    settings: Settings = app.state.settings
    return settings.app_address


def add_label_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools for making, reading, claiming and printing labels."""
    _add_reading_tools(server, app)
    _add_changing_tools(server, app)


def _add_changing_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=CREATE_BLANK_LABELS)
    async def create_blank_labels(count: int) -> Annotated[CallToolResult, BlankLabelsCreated]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.create_blank_labels(
                session, NewBlankLabels(count=count), Actor.mcp, clock.now()
            ),
        )

    @server.tool(description=CLAIM_LABEL)
    async def claim_label(code: str, location_id: str) -> Annotated[CallToolResult, LabelClaimed]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.claim_label(
                session,
                code,
                LabelClaim(location_id=service.location_id_for(session, location_id)),
                Actor.mcp,
                clock.now(),
            ),
        )

    @server.tool(description=UNCLAIM_LABEL)
    async def unclaim_label(code: str) -> Annotated[CallToolResult, LabelUnclaimed]:
        return await run_action(
            app,
            open_write_session,
            lambda session: service.unclaim_label(session, code, Actor.mcp, clock.now()),
        )


def _add_reading_tools(server: MCPServer, app: FastAPI) -> None:
    @server.tool(description=LIST_LABELS)
    async def list_labels(
        limit: int = DEFAULT_LIMIT, cursor: str | None = None
    ) -> Annotated[CallToolResult, Page[Label]]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.list_labels(session, PageLimit(limit=limit).limit, cursor),
        )

    @server.tool(description=GET_LABEL)
    async def get_label(code: str) -> Annotated[CallToolResult, Label]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.get_label(session, code),
        )

    @server.tool(description=GET_LABEL_IMAGE)
    async def get_label_image(code: str) -> CallToolResult:
        return await run_image_action(
            app,
            open_read_session,
            lambda session: service.label_image(session, code, _app_address(app)).png,
            "image/png",
        )
