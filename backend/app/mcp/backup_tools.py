from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.features.backups import service as backups
from app.features.backups.schemas import Backup, BackupList
from app.mcp.actions import run_data_directory_action

LIST_BACKUPS = """List the backups Binsight keeps of itself, newest first.

Binsight backs up its database and every photo and file once a day and keeps the newest 14,
in the backups folder of its data directory on the home server. Use this to answer "when
was the last backup?" or "is my inventory backed up?". Returns backups, each with its name
(the folder's), taken_at and size in bytes. Restoring is done by the owner on the server,
with the app stopped, following the restore steps in deploy/README.md; no tool restores."""

BACK_UP_NOW = """Take a backup now, without waiting for the daily one.

Use it before the owner makes a large change, such as an import or a big reorganization,
or when they ask to back up. It copies the database and links every photo and file into a
new folder in the data directory, and removes the oldest past 14. Nothing in the home
changes. Returns the new backup's name, taken_at and size in bytes."""


def add_backup_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the list of backups and a way to take one."""

    @server.tool(description=LIST_BACKUPS)
    async def list_backups() -> Annotated[CallToolResult, BackupList]:
        return await run_data_directory_action(app, backups.list_backups)

    @server.tool(description=BACK_UP_NOW)
    async def back_up_now() -> Annotated[CallToolResult, Backup]:
        return await run_data_directory_action(
            app, lambda settings: backups.take_backup(settings, clock.now())
        )
