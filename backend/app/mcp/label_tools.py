from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.settings import Settings
from app.features.labels import service
from app.mcp.actions import run_image_action

GET_LABEL_IMAGE = """Draw a location's label as a PNG to print: its QR code with its code beneath.

Use this when the owner wants to print a label for a location, or reprint a damaged one.
code is the location's code, such as K7Q-4MZ, in any case and with or without the hyphen.
Every location has its code from the moment it is made, and the code and the address in
the QR code never change, so a reprint replaces the old sticker exactly.

Returns the image, or the error location_not_found."""


def _app_address(app: FastAPI) -> str:
    settings: Settings = app.state.settings
    return settings.app_address


def add_label_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for printing a location's label."""

    @server.tool(description=GET_LABEL_IMAGE)
    async def get_label_image(code: str) -> CallToolResult:
        return await run_image_action(
            app,
            open_read_session,
            lambda session: service.label_image(session, code, _app_address(app)).png,
            "image/png",
        )
