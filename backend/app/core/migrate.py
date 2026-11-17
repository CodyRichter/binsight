import sqlite3
from contextlib import closing

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine

from app.core import clock
from app.core.settings import BACKEND_DIRECTORY, Settings


def _alembic_config() -> Config:
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    return config


def _current_revision(engine: Engine) -> str | None:
    with engine.connect() as connection:
        return MigrationContext.configure(connection).get_current_revision()


def _copy_database(settings: Settings, revision: str) -> None:
    settings.backups_directory.mkdir(parents=True, exist_ok=True)
    stamp = clock.now().strftime("%Y%m%dT%H%M%SZ")
    copy_path = settings.backups_directory / f"before-upgrade-from-{revision}-{stamp}.db"
    source = closing(sqlite3.connect(settings.database_path))
    with source as source_connection, closing(sqlite3.connect(copy_path)) as copy_connection:
        source_connection.backup(copy_connection)


def migrate_database(engine: Engine, settings: Settings) -> None:
    """Bring the database to the current schema, copying it first if it already has data."""
    config = _alembic_config()
    current = _current_revision(engine)
    if current == ScriptDirectory.from_config(config).get_current_head():
        return
    if current is not None:
        _copy_database(settings, current)
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
