from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.settings import Settings
from app.features.labels import service
from app.features.labels.schemas import PrintAddress, PrintedLabel
from app.mcp.actions import run_action, run_image_action

GET_LABEL_IMAGE = """Draw a location's 3x2-inch label as a PNG: its QR code with its code beside it.

Use this when the owner wants to print a label for a location, or reprint a damaged one.
code is the location's code, such as K7Q-4MZ, in any case and with or without the hyphen.
Every location has its code from the moment it is made, and the code and the address in
the QR code never change, so a reprint replaces the old sticker exactly.

Returns the image, or the error location_not_found."""

GET_PRINT_ADDRESS = """Say whether a label printer is set up: the print address labels are sent to.

Returns print_address, or null when no printer is set up. Only an admin can change it, in
the app's settings."""

PRINT_LABEL = """Print a location's label on the household's label printer, one copy.

Use this when the owner asks to print or reprint a label and a printer is set up (see
get_print_address); otherwise offer get_label_image so they can print it themselves.
code is the location's code, such as K7Q-4MZ, in any case and with or without the hyphen.
Returns the code once the printer has accepted the label, or the error location_not_found,
print_address_not_set, or print_failed with the printer's reason."""


def _app_address(app: FastAPI) -> str:
    settings: Settings = app.state.settings
    return settings.app_address


def add_label_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the label image, and printing it on the household's printer."""

    @server.tool(description=GET_LABEL_IMAGE)
    async def get_label_image(code: str) -> CallToolResult:
        return await run_image_action(
            app,
            open_read_session,
            lambda session: service.label_image(session, code, _app_address(app)).png,
            "image/png",
        )

    @server.tool(description=GET_PRINT_ADDRESS)
    async def get_print_address() -> Annotated[CallToolResult, PrintAddress]:
        return await run_action(app, open_read_session, service.get_print_address)

    @server.tool(description=PRINT_LABEL)
    async def print_label(code: str) -> Annotated[CallToolResult, PrintedLabel]:
        return await run_action(
            app,
            open_read_session,
            lambda session: service.print_label(session, code, _app_address(app)),
        )
