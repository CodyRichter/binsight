from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core.database import open_read_session
from app.core.settings import Settings
from app.features.attachments import service
from app.mcp.actions import run_image_action

GET_ATTACHMENT_FILE = """Look at an item's photo.

Use this to see what an item is, especially one added by photo that has no name yet:
the photo_url of an item ends in /api/attachments/{attachment_id}/file, and attachment_id
is the part before /file. Once you know what it shows, name the item with update_item.

Returns the photo as a JPEG image, or the error attachment_not_found."""


def add_attachment_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for looking at photos."""
    settings: Settings = app.state.settings

    @server.tool(description=GET_ATTACHMENT_FILE)
    async def get_attachment_file(attachment_id: str) -> CallToolResult:
        return await run_image_action(
            app,
            open_read_session,
            lambda session: service.photo_file(session, settings, attachment_id).read_bytes(),
            "image/jpeg",
        )
