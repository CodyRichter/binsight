from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.attachments import service
from tests.builders import NOW
from tests.photos import photo


def _created(engine: Engine, settings: Settings) -> str:
    with open_write_session(engine) as session:
        return service.create_upload(session, settings, NOW).upload_id


def _send(engine: Engine, settings: Settings, upload_id: str, content: bytes) -> None:
    with open_write_session(engine) as session:
        service.receive_upload(session, settings, upload_id, content, NOW)


def _refusal(engine: Engine, settings: Settings, upload_id: str, minutes: int = 0) -> str:
    later = NOW + timedelta(minutes=minutes)
    with pytest.raises(AppError) as refused, open_read_session(engine) as session:
        service.uploaded_content(session, settings, upload_id, later)
    return refused.value.code


def test_a_file_sent_to_an_upload_can_be_read_back_until_it_expires(
    migrated_engine: Engine, settings: Settings
) -> None:
    upload_id = _created(migrated_engine, settings)
    _send(migrated_engine, settings, upload_id, b"%PDF-1.4 receipt")
    with open_read_session(migrated_engine) as session:
        content = service.uploaded_content(session, settings, upload_id, NOW)
    assert content == b"%PDF-1.4 receipt"
    assert _refusal(migrated_engine, settings, upload_id, minutes=60) == "upload_expired"


def test_an_upload_takes_one_file_once(migrated_engine: Engine, settings: Settings) -> None:
    upload_id = _created(migrated_engine, settings)
    _send(migrated_engine, settings, upload_id, photo())
    with pytest.raises(AppError) as refused:
        _send(migrated_engine, settings, upload_id, photo())
    assert refused.value.code == "upload_already_sent"


def test_unknown_and_unsent_uploads_are_refused(
    migrated_engine: Engine, settings: Settings
) -> None:
    assert _refusal(migrated_engine, settings, "nothing") == "upload_not_found"
    upload_id = _created(migrated_engine, settings)
    assert _refusal(migrated_engine, settings, upload_id) == "upload_not_sent"


def test_making_an_upload_deletes_expired_ones_and_their_files(
    migrated_engine: Engine, settings: Settings
) -> None:
    upload_id = _created(migrated_engine, settings)
    _send(migrated_engine, settings, upload_id, photo())
    with open_write_session(migrated_engine) as session:
        service.create_upload(session, settings, NOW + timedelta(hours=2))
    assert list(settings.uploads_directory.iterdir()) == []
    later = NOW + timedelta(hours=2)
    with pytest.raises(AppError) as refused, open_read_session(migrated_engine) as session:
        service.uploaded_content(session, settings, upload_id, later)
    assert refused.value.code == "upload_not_found"


def test_anyone_with_the_address_can_send_but_only_an_editor_can_create(
    signed_in: TestClient, visitor: TestClient
) -> None:
    assert visitor.post("/api/attachments/uploads").status_code == 401
    upload = signed_in.post("/api/attachments/uploads").json()
    assert upload["upload_url"].startswith("http://binsight.test/api/attachments/uploads/")
    address = f"/api/attachments/uploads/{upload['upload_id']}"
    sent = visitor.post(address, files={"file": ("shelf.jpg", photo())})
    assert (sent.status_code, sent.json()["size"]) == (201, len(photo()))
    assert (
        visitor.post("/api/attachments/uploads/nothing", files={"file": ("x", b"x")}).json()[
            "error"
        ]["code"]
        == "upload_not_found"
    )
