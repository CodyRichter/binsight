from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import create_database_engine
from app.core.settings import Settings
from app.main import build_app


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
