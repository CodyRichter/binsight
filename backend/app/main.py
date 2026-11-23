import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI

from app.core import clock, health
from app.core.cross_site import refuse_cross_site_writes
from app.core.database import create_database_engine
from app.core.errors import add_error_handlers
from app.core.frontend_files import add_frontend_files
from app.core.migrate import migrate_database
from app.core.security_headers import add_security_headers
from app.core.settings import Settings, load_settings
from app.features.attachments import routes as attachments
from app.features.auth import routes as auth
from app.features.auth.access import require
from app.features.backups import routes as backups
from app.features.backups import service as backup_schedule
from app.features.history import routes as history
from app.features.import_export import routes as import_export
from app.features.items import attachment_routes as item_attachments
from app.features.items import bulk_routes as bulk_items
from app.features.items import routes as items
from app.features.labels import routes as labels
from app.features.locations import routes as locations
from app.features.search import routes as search
from app.features.views import routes as views
from app.mcp.server import add_mcp_server
from app.models import Role

# Every feature router goes in exactly one group; tests/test_access.py fails on any left out.
ROUTERS_BY_ROLE: dict[Role | None, list[APIRouter]] = {
    None: [
        auth.router,
        locations.router,
        items.router,
        items.categories_and_tags_router,
        item_attachments.router,
        labels.router,
        attachments.router,
        search.router,
        views.router,
        views.saved_searches_router,
        import_export.router,
    ],
    Role.viewer: [auth.own_account_router, history.router, import_export.insurance_router],
    Role.editor: [
        locations.write_router,
        bulk_items.router,
        items.write_router,
        items.unlink_router,
        item_attachments.write_router,
        attachments.uploads_router,
        history.undo_router,
        views.saved_search_changes_router,
        labels.print_router,
    ],
    Role.admin: [
        auth.accounts_router,
        auth.mcp_credentials_router,
        import_export.everything_router,
        backups.router,
        labels.print_address_router,
    ],
}


def _routes_by_role() -> APIRouter:
    api = APIRouter()
    for role, routers in ROUTERS_BY_ROLE.items():
        group = APIRouter(dependencies=[Depends(require(role))])
        for router in routers:
            group.include_router(router)
        api.include_router(group)
    return api


def build_app(settings: Settings) -> FastAPI:
    """Assemble the web API, the MCP server and the frontend's files for one install."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        settings.data_directory.mkdir(parents=True, exist_ok=True)
        engine = create_database_engine(settings.database_path)
        migrate_database(engine, settings)
        app.state.engine = engine
        # Taken before the app answers, so an install is never without a backup once started.
        await asyncio.to_thread(backup_schedule.take_backup_if_due, settings, clock.now())
        schedule = asyncio.create_task(backup_schedule.run_schedule(settings))
        async with mcp_server.session_manager.run():
            yield
        schedule.cancel()
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
    app.include_router(_routes_by_role(), prefix="/api")
    mcp_server = add_mcp_server(app)
    add_frontend_files(app, settings.frontend_directory)
    return app


def create_app() -> FastAPI:
    """The server's entry point: the app configured from the environment."""
    return build_app(load_settings())
