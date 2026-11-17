from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

EVERY_RESPONSE = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
}
# Mantine sets styles inline; the built app has no inline script.
PAGE_POLICY = "; ".join(
    [
        "default-src 'self'",
        # The in-app scanner decodes QR codes with WebAssembly (decision 0017).
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
    ]
)


def _is_frontend_page(request: Request, response: Response) -> bool:
    is_api = request.url.path.startswith(("/api/", "/mcp"))
    return not is_api and response.headers.get("content-type", "").startswith("text/html")


def add_security_headers(app: FastAPI) -> None:
    """Tell the browser to keep API answers out of its cache and the app out of frames."""

    @app.middleware("http")
    async def add_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers.update(EVERY_RESPONSE)
        # A route that says how it may be cached, such as a photo's file, keeps its own answer.
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        if _is_frontend_page(request, response):
            response.headers["Content-Security-Policy"] = PAGE_POLICY
        return response
