from collections.abc import Callable

from fastapi import Request

from app.core import clock
from app.core.database import open_read_session
from app.core.errors import AppError
from app.features.auth import service
from app.features.auth.session_cookie import read_session_cookie
from app.models import Role


def require(needed: Role | None) -> Callable[[Request], None]:
    """A check that notes who is signed in and refuses the request unless their role allows it."""

    def check(request: Request) -> None:
        with open_read_session(request.app.state.engine) as session:
            account = service.current_account(session, read_session_cookie(request), clock.now())
            request.state.username = account.username if account else None
            request.state.account_id = account.id if account else None
            role = account.role if account else None
        if needed is None:
            return
        if role is None:
            raise AppError(401, "not_signed_in", "Sign in to continue.")
        if not service.allows(role, needed):
            raise AppError(403, "not_allowed", "Your account can't do that.")

    return check
