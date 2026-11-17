from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, select

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.auth import service
from app.models import LoginSession, McpCredential, Owner

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)
PASSWORD = "correct horse"  # noqa: S105 -- a made-up password for the tests


def _create_owner(engine: Engine) -> str:
    with open_write_session(engine) as session:
        return service.create_owner(session, PASSWORD, NOW)


def _sign_in(engine: Engine, password: str, now: datetime = NOW) -> str:
    with open_write_session(engine) as session:
        return service.sign_in(session, password, now)


def _is_signed_in(engine: Engine, secret: str, now: datetime = NOW) -> bool:
    with open_read_session(engine) as session:
        return service.is_signed_in(session, secret, now)


def _refusal_code(action: object) -> str:
    assert callable(action)
    with pytest.raises(AppError) as refusal:
        action()
    return refusal.value.code


def test_a_new_install_has_no_owner_and_is_signed_out(migrated_engine: Engine) -> None:
    with open_read_session(migrated_engine) as session:
        status = service.get_auth_status(session, None, NOW)
    assert (status.owner_exists, status.signed_in) == (False, False)


def test_the_first_password_creates_the_owner_and_signs_in(migrated_engine: Engine) -> None:
    secret = _create_owner(migrated_engine)
    with open_read_session(migrated_engine) as session:
        status = service.get_auth_status(session, secret, NOW)
    assert (status.owner_exists, status.signed_in) == (True, True)


def test_a_second_owner_is_refused(migrated_engine: Engine) -> None:
    _create_owner(migrated_engine)
    assert _refusal_code(lambda: _create_owner(migrated_engine)) == "owner_exists"


def test_signing_in_before_an_owner_exists_is_refused(migrated_engine: Engine) -> None:
    assert _refusal_code(lambda: _sign_in(migrated_engine, PASSWORD)) == "owner_not_created"


def test_the_right_password_signs_in(migrated_engine: Engine) -> None:
    _create_owner(migrated_engine)
    assert _is_signed_in(migrated_engine, _sign_in(migrated_engine, PASSWORD))


def test_a_wrong_password_is_refused(migrated_engine: Engine) -> None:
    _create_owner(migrated_engine)
    assert _refusal_code(lambda: _sign_in(migrated_engine, "wrong horse")) == "wrong_password"


def test_an_unknown_secret_is_not_signed_in(migrated_engine: Engine) -> None:
    _create_owner(migrated_engine)
    assert not _is_signed_in(migrated_engine, "made-up")


def test_a_session_stops_working_when_it_expires(migrated_engine: Engine) -> None:
    secret = _create_owner(migrated_engine)
    assert _is_signed_in(migrated_engine, secret, NOW + timedelta(days=399))
    assert not _is_signed_in(migrated_engine, secret, NOW + timedelta(days=400))


def test_a_session_stops_working_after_sign_out(migrated_engine: Engine) -> None:
    secret = _create_owner(migrated_engine)
    with open_write_session(migrated_engine) as session:
        service.sign_out(session, secret)
    assert not _is_signed_in(migrated_engine, secret)


def test_signing_in_clears_away_expired_sessions(migrated_engine: Engine) -> None:
    _create_owner(migrated_engine)
    _sign_in(migrated_engine, PASSWORD, NOW + timedelta(days=500))
    with open_read_session(migrated_engine) as session:
        remaining = session.scalars(select(LoginSession)).all()
    assert len(remaining) == 1


def test_neither_the_password_nor_the_secret_is_stored(migrated_engine: Engine) -> None:
    secret = _create_owner(migrated_engine)
    with open_read_session(migrated_engine) as session:
        password_hash = session.scalars(select(Owner.password_hash)).one()
        secret_hash = session.scalars(select(LoginSession.secret_hash)).one()
    assert PASSWORD not in password_hash
    assert secret not in secret_hash


def _create_credential(engine: Engine, name: str = "Claude Code", now: datetime = NOW) -> str:
    with open_write_session(engine) as session:
        return service.create_mcp_credential(session, name, now).secret


def _credential_names(engine: Engine, limit: int = 50, cursor: str | None = None) -> list[str]:
    with open_read_session(engine) as session:
        return [row.name for row in service.list_mcp_credentials(session, limit, cursor).items]


def _is_mcp_credential(engine: Engine, secret: str) -> bool:
    with open_read_session(engine) as session:
        return service.is_mcp_credential(session, secret)


def _revoke(engine: Engine, credential_id: str) -> None:
    with open_write_session(engine) as session:
        service.revoke_mcp_credential(session, credential_id, NOW)


def _credential_id(engine: Engine, name: str) -> str:
    with open_read_session(engine) as session:
        return session.scalars(select(McpCredential.id).where(McpCredential.name == name)).one()


def test_a_new_mcp_credential_works_as_a_bearer_secret(migrated_engine: Engine) -> None:
    secret = _create_credential(migrated_engine)
    assert _is_mcp_credential(migrated_engine, secret)
    assert not _is_mcp_credential(migrated_engine, "made-up")


def test_mcp_credentials_are_listed_newest_first_a_page_at_a_time(
    migrated_engine: Engine,
) -> None:
    for minutes, name in enumerate(["Laptop", "Desktop", "Phone"]):
        _create_credential(migrated_engine, name, NOW + timedelta(minutes=minutes))
    with open_read_session(migrated_engine) as session:
        first = service.list_mcp_credentials(session, 2, None)
    assert [row.name for row in first.items] == ["Phone", "Desktop"]
    assert first.next_cursor is not None
    assert _credential_names(migrated_engine, 2, first.next_cursor) == ["Laptop"]


def test_a_revoked_mcp_credential_stops_working_and_is_not_listed(
    migrated_engine: Engine,
) -> None:
    secret = _create_credential(migrated_engine, "Laptop")
    _create_credential(migrated_engine, "Desktop")
    _revoke(migrated_engine, _credential_id(migrated_engine, "Laptop"))
    assert not _is_mcp_credential(migrated_engine, secret)
    assert _credential_names(migrated_engine) == ["Desktop"]


def test_revoking_an_unknown_or_revoked_mcp_credential_is_refused(
    migrated_engine: Engine,
) -> None:
    _create_credential(migrated_engine)
    credential_id = _credential_id(migrated_engine, "Claude Code")
    _revoke(migrated_engine, credential_id)
    assert _refusal_code(lambda: _revoke(migrated_engine, credential_id)) == (
        "mcp_credential_not_found"
    )
    assert _refusal_code(lambda: _revoke(migrated_engine, "made-up")) == (
        "mcp_credential_not_found"
    )


def test_an_mcp_credential_s_secret_is_not_stored(migrated_engine: Engine) -> None:
    secret = _create_credential(migrated_engine)
    with open_read_session(migrated_engine) as session:
        secret_hash = session.scalars(select(McpCredential.secret_hash)).one()
    assert secret not in secret_hash
