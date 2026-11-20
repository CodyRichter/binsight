from app.core.settings import Settings
from app.main import build_app
from tests.mcp.conftest import Claude

# Routes Claude has no use for: health and sign-in, and accounts and MCP credentials,
# because a credential that could make credentials or accounts could not be revoked for good.
# send_upload is how a client sends a file's bytes to an upload's address outside MCP.
NO_TOOL = {
    "send_upload",
    "get_health",
    "get_auth_status",
    "create_first_admin",
    "sign_in",
    "sign_out",
    "change_own_password",
    "list_accounts",
    "create_account",
    "update_account",
    "delete_account",
    "create_mcp_credential",
    "list_mcp_credentials",
    "revoke_mcp_credential",
}


def test_every_route_has_a_tool_of_the_same_name_and_every_tool_a_route(
    settings: Settings, claude: Claude
) -> None:
    paths = build_app(settings).openapi()["paths"]
    operations = {
        operation["operationId"] for methods in paths.values() for operation in methods.values()
    }
    assert operations >= NO_TOOL
    assert claude.tool_names() == operations - NO_TOOL
