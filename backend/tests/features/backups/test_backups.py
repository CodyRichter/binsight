import sqlite3
from contextlib import closing
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_write_session
from app.core.settings import Settings
from app.features.backups import service
from tests import builders

NOON = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)


def _names_in(database: str) -> list[str]:
    with closing(sqlite3.connect(database)) as connection:
        return [row[0] for row in connection.execute("SELECT name FROM item ORDER BY name")]


def test_a_backup_holds_the_database_and_links_to_every_stored_file(
    settings: Settings, migrated_engine: Engine
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "HDMI cable", builders.location(session).id)
    settings.attachments_directory.mkdir()
    photo = settings.attachments_directory / "photo.jpg"
    photo.write_bytes(b"jpeg")
    backup = service.take_backup(settings, NOON)
    folder = settings.backups_directory / backup.name
    assert backup.name == "20261118T120000Z"
    assert backup.taken_at == NOON
    assert _names_in(str(folder / "binsight.db")) == ["HDMI cable"]
    assert (folder / "attachments" / "photo.jpg").stat().st_ino == photo.stat().st_ino
    assert backup.size == sum(file.stat().st_size for file in folder.rglob("*") if file.is_file())


@pytest.mark.usefixtures("migrated_engine")
def test_the_newest_fourteen_are_kept_and_upgrade_copies_left_alone(settings: Settings) -> None:
    settings.backups_directory.mkdir()
    upgrade_copy = settings.backups_directory / "before-upgrade-from-abc-20261101T000000Z.db"
    upgrade_copy.write_bytes(b"")
    for day in range(15):
        service.take_backup(settings, NOON + timedelta(days=day))
    names = [backup.name for backup in service.list_backups(settings).backups]
    assert len(names) == 14
    assert names[0] == "20261202T120000Z"
    assert "20261118T120000Z" not in names
    assert upgrade_copy.exists()


@pytest.mark.usefixtures("migrated_engine")
def test_an_unfinished_backup_is_not_listed_and_goes_at_the_next(settings: Settings) -> None:
    unfinished = settings.backups_directory / "20261117T120000Z.partial"
    unfinished.mkdir(parents=True)
    assert service.list_backups(settings).backups == []
    service.take_backup(settings, NOON)
    assert not unfinished.exists()


def test_a_second_backup_in_the_same_second_replaces_the_first(
    settings: Settings, migrated_engine: Engine
) -> None:
    service.take_backup(settings, NOON)
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Drill")
    second = service.take_backup(settings, NOON)
    assert [backup.name for backup in service.list_backups(settings).backups] == [second.name]
    assert _names_in(str(settings.backups_directory / second.name / "binsight.db")) == ["Drill"]


@pytest.mark.usefixtures("migrated_engine")
def test_a_backup_is_due_a_day_after_the_last(settings: Settings) -> None:
    assert service.take_backup_if_due(settings, NOON) is not None
    assert service.take_backup_if_due(settings, NOON + timedelta(hours=23)) is None
    assert service.take_backup_if_due(settings, NOON + timedelta(hours=24)) is not None


def test_backing_up_now_adds_a_backup_to_the_list(signed_in: TestClient) -> None:
    response = signed_in.post("/api/backups")
    assert response.status_code == 201
    listed = signed_in.get("/api/backups").json()["backups"]
    assert response.json()["name"] in [backup["name"] for backup in listed]


def test_starting_the_app_takes_the_first_backup(signed_in: TestClient) -> None:
    assert signed_in.get("/api/backups").json()["backups"] != []


def test_backups_need_sign_in(client: TestClient) -> None:
    assert client.get("/api/backups").status_code == 401
    assert client.post("/api/backups").status_code == 401
