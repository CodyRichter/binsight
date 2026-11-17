from pathlib import Path
from typing import NoReturn

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import FileResponse

from app.core.errors import AppError


def _api_route_not_found(request: Request) -> NoReturn:
    raise AppError(
        404,
        "route_not_found",
        f"There is no {request.method} {request.url.path} in the API.",
    )


def _frontend_file(frontend_directory: Path, path: str) -> FileResponse:
    requested = (frontend_directory / path).resolve()
    if requested.is_file() and requested.is_relative_to(frontend_directory.resolve()):
        return FileResponse(requested)
    # A page from before an upgrade asks for chunks that are gone; HTML in their place breaks it.
    if path.startswith("assets/"):
        raise AppError(404, "file_not_found", f"There is no built file at /{path}.")
    # Built files have hashed names, so only the page itself must be checked for a new version.
    return FileResponse(frontend_directory / "index.html", headers={"Cache-Control": "no-cache"})


def add_frontend_files(app: FastAPI, frontend_directory: Path) -> None:
    """Serve the built frontend for every path that is not the API's or MCP's."""
    router = APIRouter(include_in_schema=False)
    methods = ["GET", "POST", "PATCH", "PUT", "DELETE"]
    router.add_api_route(
        "/api/{path:path}", _api_route_not_found, methods=methods, response_model=None
    )

    @router.get("/{path:path}")
    def frontend_file(path: str) -> FileResponse:
        return _frontend_file(frontend_directory, path)

    app.include_router(router)
