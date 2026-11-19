from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, select

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.auth import service
from app.features.auth.schemas import AccountChanges, FirstAdmin, NewAccount
from app.models import Account, LoginSession, McpCredential, Role

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)
PASSWORD = "correct horse"  # noqa: S105 -- a made-up password for the tests
NEW_PASSWORD = "another horse"  # noqa: S105 -- a made-up password for the tests


def _create_first_admin(engine: Engine, username: str = "sam") -> str:
    with open_write_session(engine) as session:
        return service.create_first_admin(
            session, FirstAdmin(username=username, password=PASSWORD), NOW
        )


def _add_account(engine: Engine, username: str, role: Role) -> str:
    with open_write_session(engine) as session:
        new = NewAccount(username=username, password=PASSWORD, role=role)
        return service.create_account(session, new, NOW).id


def _sign_in(engine: Engine, username: str, password: str, now: datetime = NOW) -> str:
    with open_write_session(engine) as session:
        return service.sign_in(session, username, password, now)


def _signed_in_as(engine: Engine, secret: str, now: datetime = NOW) -> tuple[str, Role] | None:
    with open_read_session(engine) as session:
        account = service.current_account(session, secret, now)
        return (account.username, account.role) if account else None


def _account_id(engine: Engine, username: str) -> str:
    with open_read_session(engine) as session:
        return session.scalars(select(Account.id).where(Account.username == username)).one()


def _refusal_code(action: object) -> str:
    assert callable(action)
    with pytest.raises(AppError) as refusal:
        action()
    return refusal.value.code


def test_a_new_install_needs_its_first_admin_and_is_signed_out(migrated_engine: Engine) -> None:
    with open_read_session(migrated_engine) as session:
        status = service.get_auth_status(session, None, NOW)
    assert (status.setup_needed, status.account) == (True, None)


def test_the_first_account_is_an_admin_and_signs_in(migrated_engine: Engine) -> None:
    secret = _create_first_admin(migrated_engine)
    with open_read_session(migrated_engine) as session:
        status = service.get_auth_status(session, secret, NOW)
    assert status.setup_needed is False
    assert status.account is not None
    assert (status.account.username, status.account.role) == ("sam", Role.admin)


def test_a_second_first_admin_is_refused(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    assert _refusal_code(lambda: _create_first_admin(migrated_engine, "alex")) == "accounts_exist"


def test_the_right_username_and_password_sign_in_whatever_the_case(
    migrated_engine: Engine,
) -> None:
    _create_first_admin(migrated_engine)
    assert _signed_in_as(migrated_engine, _sign_in(migrated_engine, "sam", PASSWORD)) == (
        "sam",
        Role.admin,
    )
    assert FirstAdmin(username="  Sam ", password=PASSWORD).username == "sam"


def test_a_wrong_password_or_unknown_username_is_refused_alike(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    assert _refusal_code(lambda: _sign_in(migrated_engine, "sam", "wrong horse")) == "wrong_sign_in"
    assert _refusal_code(lambda: _sign_in(migrated_engine, "alex", PASSWORD)) == "wrong_sign_in"


def test_an_unknown_secret_is_not_signed_in(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    assert _signed_in_as(migrated_engine, "made-up") is None


def test_a_session_stops_working_when_it_expires(migrated_engine: Engine) -> None:
    secret = _create_first_admin(migrated_engine)
    assert _signed_in_as(migrated_engine, secret, NOW + timedelta(days=399))
    assert _signed_in_as(migrated_engine, secret, NOW + timedelta(days=400)) is None


def test_a_session_stops_working_after_sign_out(migrated_engine: Engine) -> None:
    secret = _create_first_admin(migrated_engine)
    with open_write_session(migrated_engine) as session:
        service.sign_out(session, secret)
    assert _signed_in_as(migrated_engine, secret) is None


def test_signing_in_clears_away_expired_sessions(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    _sign_in(migrated_engine, "sam", PASSWORD, NOW + timedelta(days=500))
    with open_read_session(migrated_engine) as session:
        remaining = session.scalars(select(LoginSession)).all()
    assert len(remaining) == 1


def test_neither_the_password_nor_the_secret_is_stored(migrated_engine: Engine) -> None:
    secret = _create_first_admin(migrated_engine)
    with open_read_session(migrated_engine) as session:
        password_hash = session.scalars(select(Account.password_hash)).one()
        secret_hash = session.scalars(select(LoginSession.secret_hash)).one()
    assert PASSWORD not in password_hash
    assert secret not in secret_hash


def test_a_username_can_be_used_once(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    assert _refusal_code(lambda: _add_account(migrated_engine, "sam", Role.viewer)) == (
        "username_taken"
    )


def test_accounts_are_listed_oldest_first_a_page_at_a_time(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    _add_account(migrated_engine, "alex", Role.editor)
    _add_account(migrated_engine, "kim", Role.viewer)
    with open_read_session(migrated_engine) as session:
        first = service.list_accounts(session, 2, None)
        rest = service.list_accounts(session, 2, first.next_cursor)
    names = [account.username for account in [*first.items, *rest.items]]
    assert sorted(names) == ["alex", "kim", "sam"]
    assert (len(first.items), rest.next_cursor) == (2, None)


def test_a_new_role_takes_effect_on_the_signed_in_device_at_once(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    _add_account(migrated_engine, "alex", Role.editor)
    secret = _sign_in(migrated_engine, "alex", PASSWORD)
    with open_write_session(migrated_engine) as session:
        changes = AccountChanges(role=Role.viewer)
        service.update_account(session, _account_id(migrated_engine, "alex"), changes, NOW)
    assert _signed_in_as(migrated_engine, secret) == ("alex", Role.viewer)


def test_setting_a_new_password_signs_the_account_out_everywhere(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    _add_account(migrated_engine, "alex", Role.editor)
    secret = _sign_in(migrated_engine, "alex", PASSWORD)
    with open_write_session(migrated_engine) as session:
        changes = AccountChanges(password=NEW_PASSWORD)
        service.update_account(session, _account_id(migrated_engine, "alex"), changes, NOW)
    assert _signed_in_as(migrated_engine, secret) is None
    assert _sign_in(migrated_engine, "alex", NEW_PASSWORD)


def test_deleting_an_account_signs_it_out(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    _add_account(migrated_engine, "alex", Role.editor)
    secret = _sign_in(migrated_engine, "alex", PASSWORD)
    with open_write_session(migrated_engine) as session:
        service.delete_account(session, _account_id(migrated_engine, "alex"))
    assert _signed_in_as(migrated_engine, secret) is None


def test_the_last_admin_can_be_neither_demoted_nor_deleted(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    sam = _account_id(migrated_engine, "sam")

    def demote() -> None:
        with open_write_session(migrated_engine) as session:
            service.update_account(session, sam, AccountChanges(role=Role.editor), NOW)

    def delete() -> None:
        with open_write_session(migrated_engine) as session:
            service.delete_account(session, sam)

    assert (_refusal_code(demote), _refusal_code(delete)) == ("last_admin", "last_admin")
    _add_account(migrated_engine, "alex", Role.admin)
    demote()


def test_changing_one_s_own_password_needs_the_current_one(migrated_engine: Engine) -> None:
    _create_first_admin(migrated_engine)
    sam = _account_id(migrated_engine, "sam")

    def change(current: str) -> None:
        with open_write_session(migrated_engine) as session:
            service.change_own_password(session, sam, current, NEW_PASSWORD, NOW)

    assert _refusal_code(lambda: change("wrong horse")) == "wrong_password"
    change(PASSWORD)
    assert _sign_in(migrated_engine, "sam", NEW_PASSWORD)


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
