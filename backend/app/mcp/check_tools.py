from datetime import datetime
from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import open_write_session
from app.features.checks import service
from app.features.checks.schemas import CheckLocation, CheckPreview, LocationChecked
from app.features.labels import service as labels
from app.mcp import confirmation
from app.mcp.actions import run_action
from app.models import Actor

CHECK_LOCATION = """Record that a location's contents are right, as of now.

Use this when the owner says a bin or location holds what Binsight lists, or has just gone
through it. location_id may be the location's label code, such as B-014. A check covers
only the items directly in that location, not locations beneath it. Its time becomes the
location's last_checked_at, which every item there carries too, so answers show how
fresh they are.

If some listed items were not there, give their ids as missing_item_ids. Marking items
missing changes many records, so that call comes in two steps: the first returns
{"preview": {"location": ..., "marked_missing": [...]}, "confirmation_token": ...,
"expires_at": ..., "checked": null} and changes nothing. Tell the owner which items will
be marked missing and ask. Only when they agree, call again with the same location_id and
missing_item_ids and the confirmation_token. A token works once and expires after ten
minutes. With no missing items, the check happens straight away.

Returns {"preview": null, "confirmation_token": null, "expires_at": null, "checked": ...},
where checked is the location with its last_checked_at, the items marked missing, and the
history_entry_id; undo_history_entry with it reverses the check and the statuses. Refused
with not_in_location for an item not directly in that location, already_missing,
confirmation_invalid or confirmation_expired."""


class CheckLocationAnswer(BaseModel):
    """Either the preview and its token from the first call, or the check that was made."""

    preview: CheckPreview | None
    confirmation_token: str | None
    expires_at: datetime | None
    checked: LocationChecked | None


def _check(
    session: Session, location_id: str, missing_item_ids: list[str], token: str | None
) -> CheckLocationAnswer:
    now = clock.now()
    location = labels.location_id_for(session, location_id)
    check = CheckLocation(missing_item_ids=missing_item_ids)
    inputs = {"location_id": location, "missing_item_ids": missing_item_ids}
    if missing_item_ids and token is None:
        preview = service.preview_check_location(session, location, check)
        issued = confirmation.issue(session, "check_location", inputs, now)
        return CheckLocationAnswer(
            preview=preview,
            confirmation_token=issued.token,
            expires_at=issued.expires_at,
            checked=None,
        )
    if missing_item_ids and token is not None:
        confirmation.redeem(session, "check_location", inputs, token, now)
    checked = service.check_location(session, location, check, Actor.mcp, now)
    return CheckLocationAnswer(
        preview=None, confirmation_token=None, expires_at=None, checked=checked
    )


def add_check_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the tool for recording that a location's contents are right."""

    @server.tool(description=CHECK_LOCATION)
    async def check_location(
        location_id: str,
        missing_item_ids: list[str] | None = None,
        confirmation_token: str | None = None,
    ) -> Annotated[CallToolResult, CheckLocationAnswer]:
        return await run_action(
            app,
            open_write_session,
            lambda session: _check(
                session, location_id, missing_item_ids or [], confirmation_token
            ),
        )
