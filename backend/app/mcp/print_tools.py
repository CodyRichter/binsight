from typing import Annotated

from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult

from app.core import clock
from app.core.database import open_read_session
from app.features.import_export import service as import_export
from app.features.import_export.schemas import ContentsSheet, InsuranceList
from app.features.locations import service as locations
from app.mcp.actions import run_action

GET_INSURANCE_LIST = """List everything still owned, for insurance: the whole home, or one location
and everything inside it.

Use it for "what is my stuff worth?", "what would I claim if the garage flooded?", or to
gather serial numbers and receipts. location_id is a location's code, such as
K7Q-4MZ; leave it out for the whole home, inbox included. Sold, given away, thrown
away and deleted items are left out.

Returns the title, path, made_at, item_count, total_cents (each price times its quantity,
summed), items_without_price, and items, each with its path, quantity, status, brand,
model, serial_number, purchase_date, price_cents, order_link, photo_urls and receipts (each
file's name and every web link). The owner can print the same list from the app."""

GET_CONTENTS_SHEET = """Show what is in a location as its printable contents sheet, grouped by the
location each thing is kept in.

location_id is a location's code, such as K7Q-4MZ. Returns the location
(path, code, summary) and groups: the location itself first, then
every location inside it, parents before children, each with its path, location_id and
items (name, quantity, status). Sold, given away, thrown away and deleted items are left
out. The owner prints the sheet from the location's page in the app."""


def add_print_tools(server: MCPServer, app: FastAPI) -> None:
    """Give Claude the insurance list and contents sheets the app prints."""

    @server.tool(description=GET_INSURANCE_LIST)
    async def get_insurance_list(
        location_id: str | None = None,
    ) -> Annotated[CallToolResult, InsuranceList]:
        return await run_action(
            app,
            open_read_session,
            lambda session: import_export.get_insurance_list(
                session,
                None if location_id is None else locations.location_code(location_id),
                clock.now(),
            ),
        )

    @server.tool(description=GET_CONTENTS_SHEET)
    async def get_contents_sheet(location_id: str) -> Annotated[CallToolResult, ContentsSheet]:
        return await run_action(
            app,
            open_read_session,
            lambda session: import_export.get_contents_sheet(
                session, locations.location_code(location_id)
            ),
        )
