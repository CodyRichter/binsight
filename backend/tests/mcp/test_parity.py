from app.core.settings import Settings
from app.main import build_app
from tests.mcp.conftest import Claude

# Routes Claude has no use for: health and sign-in, and the MCP credentials themselves,
# because a credential that could make credentials could not be revoked for good.
NO_TOOL = {
    "get_health",
    "get_auth_status",
    "create_owner",
    "sign_in",
    "sign_out",
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
