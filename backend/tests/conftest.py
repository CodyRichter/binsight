from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import create_database_engine
from app.core.migrate import migrate_database
from app.core.settings import Settings
from app.features.auth import passwords
from app.main import build_app


@pytest.fixture(autouse=True)
def quick_password_hashing(monkeypatch: pytest.MonkeyPatch) -> None:
    # The real cost takes a noticeable moment per hash; the stored hash keeps whichever was used.
    monkeypatch.setattr(passwords, "COST", 2**4)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    frontend_directory = tmp_path / "frontend"
    (frontend_directory / "assets").mkdir(parents=True)
    (frontend_directory / "index.html").write_text("<!doctype html><title>Binsight</title>")
    (frontend_directory / "assets" / "app.js").write_text("console.log('app')")
    return Settings(
        app_address="http://binsight.test",
        data_directory=tmp_path / "data",
        frontend_directory=frontend_directory,
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(build_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    database_engine = create_database_engine(tmp_path / "test.db")
    yield database_engine
    database_engine.dispose()


@pytest.fixture
def migrated_engine(settings: Settings) -> Iterator[Engine]:
    settings.data_directory.mkdir()
    database_engine = create_database_engine(settings.database_path)
    migrate_database(database_engine, settings)
    yield database_engine
    database_engine.dispose()
