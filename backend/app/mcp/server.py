from fastapi import FastAPI
from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.routing import Route

from app.mcp.access import RequireMcpCredential
from app.mcp.attachment_tools import add_attachment_tools
from app.mcp.history_tools import add_history_tools
from app.mcp.item_tools import add_item_tools
from app.mcp.label_tools import add_label_tools
from app.mcp.location_tools import add_location_tools
from app.mcp.search_tools import add_search_tools

INSTRUCTIONS = """Binsight is the owner's home inventory: locations nested in a tree (a site,
its rooms, the furniture, shelves, bins, drawers and boxes in them) and the items kept in
them. Use it to answer whether the owner has something and where it is, starting with
search_home, and to record what they add or change. A location can carry a label, a
sticker with a code such as B-014; wherever a tool takes a location identifier, the code
works too. Every change is recorded in history with the actor "mcp"; an item added or
changed by mistake can be put back with undo_history_entry and the history_entry_id the
change returned."""


def add_mcp_server(app: FastAPI) -> MCPServer:
    """Serve the MCP tools at /mcp; its session manager must run inside the app's lifespan."""
    server = MCPServer(name="Binsight", instructions=INSTRUCTIONS)
    add_location_tools(server, app)
    add_item_tools(server, app)
    add_label_tools(server, app)
    add_history_tools(server, app)
    add_attachment_tools(server, app)
    add_search_tools(server, app)
    mcp_app = server.streamable_http_app(
        streamable_http_path="/mcp",
        json_response=True,
        stateless_http=True,
        # Host checks guard against DNS rebinding; a rebinding page has no bearer token anyway.
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
    )
    app.router.routes.append(Route("/mcp", RequireMcpCredential(mcp_app)))
    return server
