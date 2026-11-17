from fastapi import APIRouter, Request, Response

from app.core import clock
from app.core.database import ReadSession, WriteSession, open_read_session
from app.core.errors import AppError, refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.auth import service
from app.features.auth.schemas import (
    AuthStatus,
    McpCredential,
    McpCredentialCreated,
    NewMcpCredential,
    Password,
)
from app.features.auth.session_cookie import (
    clear_session_cookie,
    read_session_cookie,
    set_session_cookie,
)

router = APIRouter(prefix="/auth")
# Signed in only: main.py includes this one among the routers that need a session.
mcp_credentials_router = APIRouter(prefix="/auth/mcp-credentials")
SIGNED_IN = AuthStatus(owner_exists=True, signed_in=True)


def require_sign_in(request: Request) -> None:
    """Refuse the request unless it carries the cookie of a current login session."""
    with open_read_session(request.app.state.engine) as session:
        if service.is_signed_in(session, read_session_cookie(request), clock.now()):
            return
    raise AppError(401, "not_signed_in", "Sign in to continue.")


@router.get("/status", operation_id="get_auth_status")
def get_auth_status(request: Request, session: ReadSession) -> AuthStatus:
    return service.get_auth_status(session, read_session_cookie(request), clock.now())


@router.post("/owner", operation_id="create_owner", status_code=201, responses=refusals(409, 422))
def create_owner(
    body: Password, session: WriteSession, response: Response, settings: AppSettings
) -> AuthStatus:
    secret = service.create_owner(session, body.password, clock.now())
    set_session_cookie(response, secret, settings)
    return SIGNED_IN


@router.post("/sign-in", operation_id="sign_in", responses=refusals(401, 409, 422))
def sign_in(
    body: Password, session: WriteSession, response: Response, settings: AppSettings
) -> AuthStatus:
    secret = service.sign_in(session, body.password, clock.now())
    set_session_cookie(response, secret, settings)
    return SIGNED_IN


@router.post("/sign-out", operation_id="sign_out", status_code=204, response_class=Response)
def sign_out(request: Request, session: WriteSession, settings: AppSettings) -> Response:
    service.sign_out(session, read_session_cookie(request))
    response = Response(status_code=204)
    clear_session_cookie(response, settings)
    return response


@mcp_credentials_router.post(
    "", operation_id="create_mcp_credential", status_code=201, responses=refusals(422)
)
def create_mcp_credential(body: NewMcpCredential, session: WriteSession) -> McpCredentialCreated:
    return service.create_mcp_credential(session, body.name, clock.now())


@mcp_credentials_router.get("", operation_id="list_mcp_credentials", responses=refusals(400, 422))
def list_mcp_credentials(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[McpCredential]:
    return service.list_mcp_credentials(session, limit, cursor)


@mcp_credentials_router.post(
    "/{credential_id}/revoke",
    operation_id="revoke_mcp_credential",
    status_code=204,
    response_class=Response,
    responses=refusals(404),
)
def revoke_mcp_credential(credential_id: str, session: WriteSession) -> Response:
    service.revoke_mcp_credential(session, credential_id, clock.now())
    return Response(status_code=204)
