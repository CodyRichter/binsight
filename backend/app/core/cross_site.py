from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from app.core.errors import AppError, error_response

READING_METHODS = {"GET", "HEAD", "OPTIONS"}
TRUSTED_FETCH_SITES = {"same-origin", "none"}


def is_cross_site(request: Request, app_address: str) -> bool:
    """Whether a write was sent by a page on another site rather than Binsight's own."""
    fetch_site = request.headers.get("sec-fetch-site")
    if fetch_site is not None:
        return fetch_site not in TRUSTED_FETCH_SITES
    # Older browsers send no Sec-Fetch-Site, but do send Origin with a cross-site write.
    origin = request.headers.get("origin")
    return origin is not None and origin != app_address


def refuse_cross_site_writes(app: FastAPI, app_address: str) -> None:
    """Refuse API writes from other sites, so a page elsewhere cannot use the owner's cookie."""

    @app.middleware("http")
    async def refuse(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        api_write = request.url.path.startswith("/api/") and request.method not in READING_METHODS
        if api_write and is_cross_site(request, app_address):
            return error_response(
                AppError(
                    403,
                    "cross_site_request",
                    "Binsight only accepts changes sent from its own pages.",
                )
            )
        return await call_next(request)
