from fastapi import Request, Response

from app.core.settings import Settings
from app.features.auth.service import SESSION_LIFETIME

COOKIE_NAME = "binsight_session"


def set_session_cookie(response: Response, secret: str, settings: Settings) -> None:
    # Lax, not Strict, so a label opened from the phone's camera arrives signed in.
    response.set_cookie(
        COOKIE_NAME,
        secret,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        path="/",
        secure=settings.is_https,
        httponly=True,
        samesite="lax",
    )


def read_session_cookie(request: Request) -> str | None:
    return request.cookies.get(COOKIE_NAME)


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        COOKIE_NAME, path="/", secure=settings.is_https, httponly=True, samesite="lax"
    )
