from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.routing import Route

from app.mcp.access import RequireMcpCredential
from app.mcp.attachment_tools import add_attachment_tools
from app.mcp.category_and_tag_tools import add_category_and_tag_tools
from app.mcp.check_tools import add_check_tools
from app.mcp.delete_tools import add_delete_tools
from app.mcp.history_tools import add_history_tools
from app.mcp.item_tools import add_item_tools
from app.mcp.label_tools import add_label_tools
from app.mcp.lending_tools import add_lending_tools
from app.mcp.link_tools import add_link_tools
from app.mcp.location_tools import add_location_tools
from app.mcp.move_tools import add_move_tools
from app.mcp.saved_search_tools import add_saved_search_tools
from app.mcp.search_tools import add_search_tools
from app.mcp.status_tools import add_status_tools
from app.mcp.view_tools import add_view_tools

INSTRUCTIONS = """Binsight is the owner's home inventory: locations nested in a tree (a
site, its rooms, the furniture, shelves, bins, drawers and boxes in them) and the items
kept in them. Use it to answer whether the owner has something and where it is, starting
with search_home, and to record what they add or change. Items can carry a category, tags
and details such as brand, serial number and warranty date, all set with update_item. An
item has a status (in place, in use, lent out, missing, or sold, given away or thrown
away, which is the archive), and can be linked to items it belongs with or is part of.
Built-in views answer questions across the whole home, such as what is lent out, missing
or due back to a shop: see list_views and list_view_rows. The owner's saved searches are
run with list_saved_search_rows. A
location can carry a label, a sticker with a code such as B-014; wherever a tool takes a
location identifier, the code works too. Every change is recorded in history with the
actor "mcp"; an item added or changed, moved or deleted by mistake can be put back with
undo_history_entry and the history_entry_id the change returned. Deleting asks for the
owner's confirmation first: see delete_item. Items carry photos, files such as receipts and
manuals, and web links: see list_item_attachments and get_attachment_file. Every item and
location carries last_checked_at, when the owner last confirmed that location's contents
(null if never); say how old it is, so old information is recognizably old, and use
check_location when the owner confirms a bin's contents."""


def add_mcp_server(app: FastAPI) -> MCPServer:
    """Serve the MCP tools at /mcp; its session manager must run inside the app's lifespan."""
    server = MCPServer(name="Binsight", instructions=INSTRUCTIONS)
    add_location_tools(server, app)
    add_item_tools(server, app)
    add_label_tools(server, app)
    add_history_tools(server, app)
    add_attachment_tools(server, app)
    add_search_tools(server, app)
    add_move_tools(server, app)
    add_delete_tools(server, app)
    add_check_tools(server, app)
    add_status_tools(server, app)
    add_category_and_tag_tools(server, app)
    add_link_tools(server, app)
    add_lending_tools(server, app)
    add_view_tools(server, app)
    add_saved_search_tools(server, app)
    mcp_app = server.streamable_http_app(
        streamable_http_path="/mcp",
        json_response=True,
        stateless_http=True,
        # Host checks guard against DNS rebinding; a rebinding page has no bearer token anyway.
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
    )
    app.router.routes.append(Route("/mcp", RequireMcpCredential(mcp_app)))
    return server
