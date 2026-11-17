from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core import health
from app.core.database import create_database_engine
from app.core.errors import add_error_handlers
from app.core.frontend_files import add_frontend_files
from app.core.migrate import migrate_database
from app.core.settings import Settings, load_settings


def build_app(settings: Settings) -> FastAPI:
    """Assemble the web API and the frontend's files for one install."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        settings.data_directory.mkdir(parents=True, exist_ok=True)
        engine = create_database_engine(settings.database_path)
        migrate_database(engine, settings)
        app.state.engine = engine
        yield
        engine.dispose()

    app = FastAPI(
        title="Binsight",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    add_error_handlers(app)
    app.include_router(health.router, prefix="/api")
    add_frontend_files(app, settings.frontend_directory)
    return app


def create_app() -> FastAPI:
    """The server's entry point: the app configured from the environment."""
    return build_app(load_settings())
