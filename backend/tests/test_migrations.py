from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import Engine

from app.core.database import create_database_engine
from app.core.migrate import migrate_database
from app.core.settings import Settings
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
