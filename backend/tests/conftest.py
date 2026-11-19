from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import create_database_engine
from app.core.migrate import migrate_database
from app.core.settings import Settings
from app.features.auth import passwords
from app.main import build_app
from app.models import Role


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


FIRST_ADMIN = {"username": "sam", "password": "correct horse"}


@pytest.fixture
def signed_in(client: TestClient) -> TestClient:
    """The client signed in as the install's first account, an admin."""
    client.post("/api/auth/first-admin", json=FIRST_ADMIN)
    return client


@pytest.fixture
def sign_in_as(signed_in: TestClient) -> Callable[[Role], TestClient]:
    """Make an account with a role, and give a second client signed in as it."""

    def signed_in_as(role: Role) -> TestClient:
        account = {"username": f"{role}-account", "password": "correct horse"}
        signed_in.post("/api/auth/accounts", json={**account, "role": role})
        other = TestClient(signed_in.app)
        other.post("/api/auth/sign-in", json=account)
        return other

    return signed_in_as


@pytest.fixture
def visitor(signed_in: TestClient) -> TestClient:
    """A client on the same install that has not signed in."""
    return TestClient(signed_in.app)
