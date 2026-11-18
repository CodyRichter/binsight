from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import Engine, text

from app.core.database import create_database_engine
from app.core.migrate import migrate_database
from app.core.settings import BACKEND_DIRECTORY, Settings
from app.models import Model


def _current_revision(engine: Engine) -> str | None:
    with engine.connect() as connection:
        return MigrationContext.configure(connection).get_current_revision()


def test_migrations_build_the_tables_the_models_describe(settings: Settings) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    migrate_database(engine, settings)
    with engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), Model.metadata)
    assert differences == []


def test_a_fresh_install_is_migrated_without_taking_a_copy(settings: Settings) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    migrate_database(engine, settings)
    assert _current_revision(engine) is not None
    assert not settings.backups_directory.exists()


def test_a_database_already_at_the_newest_schema_is_left_alone(settings: Settings) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    migrate_database(engine, settings)
    migrate_database(engine, settings)
    assert not settings.backups_directory.exists()


def test_items_from_before_checks_are_in_place_after_migrating(settings: Settings) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0007")
        connection.execute(
            text(
                "INSERT INTO item (id, name, quantity, created_at, updated_at)"
                " VALUES ('drill', 'Drill', 1, '2026-11-16 12:00:00', '2026-11-16 12:00:00')"
            )
        )
    migrate_database(engine, settings)
    with engine.connect() as connection:
        status = connection.execute(text("SELECT status FROM item WHERE id = 'drill'")).scalar()
    assert status == "in_place"
