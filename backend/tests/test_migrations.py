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


def test_items_from_before_details_keep_their_fields_and_have_none_yet(
    settings: Settings,
) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0008")
        connection.execute(
            text(
                "INSERT INTO item (id, name, quantity, status, created_at, updated_at)"
                " VALUES ('drill', 'Drill', 2, 'missing', '2026-11-16 12:00:00',"
                " '2026-11-16 12:00:00')"
            )
        )
    migrate_database(engine, settings)
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT name, quantity, status, category_id, notes FROM item WHERE id = 'drill'")
        ).one()
    assert tuple(row) == ("Drill", 2, "missing", None, None)


def test_items_from_before_lending_keep_their_status_and_are_not_lent(
    settings: Settings,
) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0009")
        connection.execute(
            text(
                "INSERT INTO item (id, name, quantity, status, brand, created_at, updated_at)"
                " VALUES ('drill', 'Drill', 1, 'missing', 'Makita', '2026-11-16 12:00:00',"
                " '2026-11-16 12:00:00')"
            )
        )
        connection.execute(text("INSERT INTO item_tag (item_id, tag) VALUES ('drill', '18v')"))
    migrate_database(engine, settings)
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT status, brand, lent_to, retired_at FROM item WHERE id = 'drill'")
        ).one()
        tags = connection.execute(text("SELECT tag FROM item_tag WHERE item_id = 'drill'")).all()
    assert tuple(row) == ("missing", "Makita", None, None)
    assert [tuple(tag) for tag in tags] == [("18v",)]


def test_items_with_photos_survive_upgrades_that_rebuild_the_item_table(
    settings: Settings,
) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0008")
        connection.execute(
            text(
                "INSERT INTO item (id, name, quantity, status, created_at, updated_at)"
                " VALUES ('drill', 'Drill', 1, 'in_place', '2026-11-16 12:00:00',"
                " '2026-11-16 12:00:00')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO attachment"
                " (id, item_id, kind, path, filename, position, created_at, updated_at)"
                " VALUES ('photo', 'drill', 'photo', 'attachments/photo.jpg', NULL, 0,"
                " '2026-11-16 12:00:00', '2026-11-16 12:00:00')"
            )
        )
    migrate_database(engine, settings)
    with engine.connect() as connection:
        owner = connection.execute(text("SELECT item_id FROM attachment")).scalar()
    assert owner == "drill"


def test_items_lent_before_saved_searches_keep_their_loans(settings: Settings) -> None:
    settings.data_directory.mkdir()
    engine = create_database_engine(settings.database_path)
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "0010")
        connection.execute(
            text(
                "INSERT INTO item (id, name, quantity, status, lent_to, lent_at, created_at,"
                " updated_at) VALUES ('drill', 'Drill', 1, 'lent_out', 'Sam',"
                " '2026-11-16 12:00:00', '2026-11-16 12:00:00', '2026-11-16 12:00:00')"
            )
        )
    migrate_database(engine, settings)
    with engine.connect() as connection:
        row = connection.execute(text("SELECT status, lent_to FROM item WHERE id = 'drill'")).one()
        saved = connection.execute(text("SELECT count(*) FROM saved_search")).scalar()
    assert (tuple(row), saved) == (("lent_out", "Sam"), 0)
