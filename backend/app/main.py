from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI

from app.core import health
from app.core.cross_site import refuse_cross_site_writes
from app.core.database import create_database_engine
from app.core.errors import add_error_handlers
from app.core.frontend_files import add_frontend_files
from app.core.migrate import migrate_database
from app.core.security_headers import add_security_headers
from app.core.settings import Settings, load_settings
from app.features.attachments import routes as attachments
from app.features.auth import routes as auth
from app.features.checks import routes as checks
from app.features.history import routes as history
from app.features.items import routes as items
from app.features.labels import routes as labels
from app.features.locations import routes as locations
from app.features.search import routes as search
from app.mcp.server import add_mcp_server


def _signed_in_routes() -> APIRouter:
    # Every feature router goes in here, so a route is signed-in-only unless added in build_app.
    signed_in = APIRouter(dependencies=[Depends(auth.require_sign_in)])
    signed_in.include_router(auth.mcp_credentials_router)
    signed_in.include_router(locations.router)
    signed_in.include_router(items.router)
    signed_in.include_router(labels.router)
    signed_in.include_router(history.router)
    signed_in.include_router(attachments.router)
    signed_in.include_router(search.router)
    signed_in.include_router(checks.router)
    return signed_in


def build_app(settings: Settings) -> FastAPI:
    """Assemble the web API, the MCP server and the frontend's files for one install."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        settings.data_directory.mkdir(parents=True, exist_ok=True)
        engine = create_database_engine(settings.database_path)
        migrate_database(engine, settings)
        app.state.engine = engine
        async with mcp_server.session_manager.run():
            yield
        engine.dispose()

    app = FastAPI(
        title="Binsight",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings
    add_error_handlers(app)
    # Middleware added last runs first: headers go on every answer, refusals included.
    refuse_cross_site_writes(app, settings.app_address)
    add_security_headers(app)
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(_signed_in_routes(), prefix="/api")
    mcp_server = add_mcp_server(app)
    add_frontend_files(app, settings.frontend_directory)
    return app


def create_app() -> FastAPI:
    """The server's entry point: the app configured from the environment."""
    return build_app(load_settings())
