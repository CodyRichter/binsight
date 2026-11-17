from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, select

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.auth import service
from app.models import LoginSession, Owner

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
