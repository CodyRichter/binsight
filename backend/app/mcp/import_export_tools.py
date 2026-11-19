import base64
import hashlib
from datetime import datetime
from typing import Annotated

import anyio
from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import BlobResourceContents, CallToolResult, EmbeddedResource
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_read_session, open_write_session
from app.core.settings import Settings
from app.features.import_export import service as import_export
from app.features.import_export.schemas import ImportDone, ImportPreview
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import Actor

EXPORT_EVERYTHING = """Export everything in the home as one zip file, for a backup or a move.

The zip holds binsight.json (every location, item, label, saved search, attachment
record and history entry), items.csv and locations.csv, and every photo and file under
attachments/. It can be large when there are many photos. Returns the zip as an embedded
application/zip resource."""

IMPORT_ITEMS = """Import items from CSV text, in two calls, making the locations it names.

csv_text has a header row. Only the name column is required; the others are quantity,
location, category, tags (separated by ;), notes, brand, model, serial_number,
purchase_date, price (such as 12.50), order_link, warranty_ends, return_ends (dates as
YYYY-MM-DD), status and lent_to. location is a path such as "Garage > Shelf 3 > Bin 7":
each step is matched by name under the one before, ignoring case, or by a label code such
as B-014, and steps that don't exist are made (a new top level as a site, the rest as
bins). An empty location puts the item in the inbox.

Call it first with csv_text alone: nothing is added, and it returns {"preview":
{"items_to_create", "locations_to_create", "first_item_names", "confirmation_token",
"expires_at"}, "done": null}. Tell the owner what will be added and ask them. Only when
they agree, call it again with the same csv_text and the confirmation_token.

The second call returns {"preview": null, "done": {"items_created", "locations_created",
"history_entry_id"}}; undo_history_entry takes the whole import back. Either call refuses
the whole file with import_rows_invalid, whose details.rows say which rows and columns are
wrong; nothing is added until every row is right."""


class ImportConfirmation(ImportPreview):
    confirmation_token: str
    expires_at: datetime


class ImportItemsAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or what the second imported."""

    preview: ImportConfirmation | None
    done: ImportDone | None


def _import_in_two_calls(session: Session, raw: bytes, token: str | None) -> ImportItemsAnswer:
    now = clock.now()
    # The text can be long, so the token is tied to its hash rather than the text itself.
    inputs = {"csv_sha256": hashlib.sha256(raw).hexdigest()}
    if token is None:
        preview = import_export.preview_import(session, raw)
        issued = confirmation.issue(session, "import_items", inputs, now)
        answer = ImportConfirmation(
            **preview.model_dump(),
            confirmation_token=issued.token,
            expires_at=issued.expires_at,
        )
        return ImportItemsAnswer(preview=answer, done=None)
    confirmation.redeem(session, "import_items", inputs, token, now)
    done = import_export.import_items(session, raw, Actor.mcp, now)
    return ImportItemsAnswer(preview=None, done=done)


def _zip(app: FastAPI) -> CallToolResult:
    settings: Settings = app.state.settings
    with open_read_session(app.state.engine) as session:
        export = import_export.export_everything(session, settings, clock.now())
    try:
        data = base64.b64encode(export.path.read_bytes()).decode()
    finally:
        export.path.unlink()
    blob = BlobResourceContents(
        uri=f"file:///{export.filename}", mime_type=export.content_type, blob=data
    )
    return CallToolResult(content=[EmbeddedResource(type="resource", resource=blob)])


def add_import_export_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tools to export everything and import items from CSV."""

    @server.tool(description=EXPORT_EVERYTHING)
    async def export_everything() -> CallToolResult:
        return await anyio.to_thread.run_sync(_zip, app)

    @server.tool(description=IMPORT_ITEMS)
    async def import_items(
        csv_text: str, confirmation_token: str | None = None
    ) -> Annotated[CallToolResult, ImportItemsAnswer]:
        raw = csv_text.encode()
        return await run_action(
            app,
            open_write_session,
            lambda session: _import_in_two_calls(session, raw, confirmation_token),
        )
