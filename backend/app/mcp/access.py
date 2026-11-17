import anyio
from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.database import open_read_session
from app.core.errors import AppError, error_response
from app.features.auth import service as auth


def _bearer_secret(request: Request) -> str | None:
    scheme, _, secret = request.headers.get("authorization", "").partition(" ")
    return secret if scheme.lower() == "bearer" and secret else None


def _has_mcp_credential(request: Request) -> bool:
    secret = _bearer_secret(request)
    if secret is None:
        return False
    with open_read_session(request.app.state.engine) as session:
        return auth.is_mcp_credential(session, secret)


class RequireMcpCredential:
    """Let a request reach the MCP server only with a current MCP credential as bearer token."""

    def __init__(self, mcp_app: ASGIApp) -> None:
        self.mcp_app = mcp_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        request = Request(scope)
        if await anyio.to_thread.run_sync(_has_mcp_credential, request):
            await self.mcp_app(scope, receive, send)
            return
        refusal = AppError(
            401,
            "invalid_mcp_credential",
            "Send a current MCP credential as a bearer token. Create one in settings.",
        )
        response = error_response(refusal)
        response.headers["WWW-Authenticate"] = "Bearer"
        await response(scope, receive, send)
