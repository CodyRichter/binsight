from fastapi import APIRouter, Request, Response

from app.core import clock
from app.core.database import ReadSession, WriteSession
from app.core.errors import refusals
from app.core.pagination import DEFAULT_LIMIT, Limit, Page
from app.core.settings import AppSettings
from app.features.auth import service
from app.features.auth.schemas import (
    Account,
    AccountChanges,
    AuthStatus,
    FirstAdmin,
    McpCredential,
    McpCredentialCreated,
    NewAccount,
    NewMcpCredential,
    PasswordChange,
    SignIn,
)
from app.features.auth.session_cookie import (
    clear_session_cookie,
    read_session_cookie,
    set_session_cookie,
)

router = APIRouter(prefix="/auth")
# Each router below is included in main.py behind the role it needs.
own_account_router = APIRouter(prefix="/auth")
mcp_credentials_router = APIRouter(prefix="/auth/mcp-credentials")
accounts_router = APIRouter(prefix="/auth/accounts")


@router.get("/status", operation_id="get_auth_status")
def get_auth_status(request: Request, session: ReadSession) -> AuthStatus:
    return service.get_auth_status(session, read_session_cookie(request), clock.now())


@router.post(
    "/first-admin", operation_id="create_first_admin", status_code=201, responses=refusals(409, 422)
)
def create_first_admin(
    body: FirstAdmin, session: WriteSession, response: Response, settings: AppSettings
) -> AuthStatus:
    secret = service.create_first_admin(session, body, clock.now())
    set_session_cookie(response, secret, settings)
    return service.get_auth_status(session, secret, clock.now())


@router.post("/sign-in", operation_id="sign_in", responses=refusals(401, 422))
def sign_in(
    body: SignIn, session: WriteSession, response: Response, settings: AppSettings
) -> AuthStatus:
    secret = service.sign_in(session, body.username, body.password, clock.now())
    set_session_cookie(response, secret, settings)
    return service.get_auth_status(session, secret, clock.now())


@router.post("/sign-out", operation_id="sign_out", status_code=204, response_class=Response)
def sign_out(request: Request, session: WriteSession, settings: AppSettings) -> Response:
    service.sign_out(session, read_session_cookie(request))
    response = Response(status_code=204)
    clear_session_cookie(response, settings)
    return response


@own_account_router.post(
    "/password",
    operation_id="change_own_password",
    status_code=204,
    response_class=Response,
    responses=refusals(401, 422),
)
def change_own_password(request: Request, body: PasswordChange, session: WriteSession) -> Response:
    service.change_own_password(
        session, request.state.account_id, body.current_password, body.new_password, clock.now()
    )
    return Response(status_code=204)


@accounts_router.get("", operation_id="list_accounts", responses=refusals(400, 422))
def list_accounts(
    session: ReadSession, limit: Limit = DEFAULT_LIMIT, cursor: str | None = None
) -> Page[Account]:
    return service.list_accounts(session, limit, cursor)


@accounts_router.post(
    "", operation_id="create_account", status_code=201, responses=refusals(409, 422)
)
def create_account(body: NewAccount, session: WriteSession) -> Account:
    return service.create_account(session, body, clock.now())


@accounts_router.patch(
    "/{account_id}", operation_id="update_account", responses=refusals(404, 409, 422)
)
def update_account(account_id: str, body: AccountChanges, session: WriteSession) -> Account:
    return service.update_account(session, account_id, body, clock.now())


@accounts_router.delete(
    "/{account_id}",
    operation_id="delete_account",
    status_code=204,
    response_class=Response,
    responses=refusals(404, 409),
)
def delete_account(account_id: str, session: WriteSession) -> Response:
    service.delete_account(session, account_id)
    return Response(status_code=204)


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
