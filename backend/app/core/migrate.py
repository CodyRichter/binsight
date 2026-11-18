from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Connection, Engine

from app.core import clock
from app.core.database import copy_database
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
    copy_database(settings.database_path, copy_path)


def _upgrade_and_check(connection: Connection, config: Config) -> None:
    with connection.begin():
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        broken = connection.exec_driver_sql("PRAGMA foreign_key_check").all()
        if broken:
            raise RuntimeError(f"The upgrade left rows pointing at nothing: {broken}")


def _upgrade(engine: Engine, config: Config) -> None:
    with engine.connect() as connection:
        # SQLite alters a table by rebuilding it, which foreign keys refuse under rows pointing at
        # it. The pragma is ignored inside a transaction, so it is set before one begins.
        connection.connection.cursor().execute("PRAGMA foreign_keys=OFF")
        try:
            _upgrade_and_check(connection, config)
        finally:
            connection.connection.cursor().execute("PRAGMA foreign_keys=ON")


def migrate_database(engine: Engine, settings: Settings) -> None:
    """Bring the database to the current schema, copying it first if it already has data."""
    config = _alembic_config()
    current = _current_revision(engine)
    if current == ScriptDirectory.from_config(config).get_current_head():
        return
    if current is not None:
        _copy_database(settings, current)
    _upgrade(engine, config)
