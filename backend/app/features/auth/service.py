from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.features.auth.accounts import create_account as create_account
from app.features.auth.accounts import delete_account as delete_account
from app.features.auth.accounts import list_accounts as list_accounts
from app.features.auth.accounts import make_account
from app.features.auth.accounts import update_account as update_account
from app.features.auth.mcp_credentials import create_mcp_credential as create_mcp_credential
from app.features.auth.mcp_credentials import is_mcp_credential as is_mcp_credential
from app.features.auth.mcp_credentials import list_mcp_credentials as list_mcp_credentials
from app.features.auth.mcp_credentials import revoke_mcp_credential as revoke_mcp_credential
from app.features.auth.passwords import hash_password, password_matches
from app.features.auth.schemas import AuthStatus, FirstAdmin, NewAccount, SignedInAccount
from app.features.auth.sessions import hash_secret, start_login_session
from app.models import Account, LoginSession, Role

ROLE_ORDER = [Role.viewer, Role.editor, Role.admin]


def allows(role: Role, needed: Role) -> bool:
    """Whether an account with this role may do what the needed role may."""
    return ROLE_ORDER.index(role) >= ROLE_ORDER.index(needed)


def current_account(session: Session, secret: str | None, now: datetime) -> Account | None:
    """The account a session secret signs in, unless the session has ended or expired."""
    if secret is None:
        return None
    signed_in = (
        select(Account)
        .join(LoginSession, LoginSession.account_id == Account.id)
        .where(LoginSession.secret_hash == hash_secret(secret))
        .where(LoginSession.expires_at > now)
    )
    return session.scalars(signed_in).first()


def get_auth_status(session: Session, secret: str | None, now: datetime) -> AuthStatus:
    """Say whether the install still needs its first admin, and who this device is signed in as."""
    account = current_account(session, secret, now)
    return AuthStatus(
        setup_needed=session.scalars(select(Account.id)).first() is None,
        account=SignedInAccount(id=account.id, username=account.username, role=account.role)
        if account
        else None,
    )


def create_first_admin(session: Session, first: FirstAdmin, now: datetime) -> str:
    """Make a new install's first account, an admin, and sign this device in as it."""
    if session.scalars(select(Account.id)).first() is not None:
        raise AppError(409, "accounts_exist", "This install already has accounts. Sign in.")
    new = NewAccount(username=first.username, password=first.password, role=Role.admin)
    return start_login_session(session, make_account(session, new, now), now)


def sign_in(session: Session, username: str, password: str, now: datetime) -> str:
    """Sign this device in with an account's username and password."""
    account = session.scalars(select(Account).where(Account.username == username)).first()
    if account is None:
        # Hashed anyway, so a wrong username takes as long to refuse as a wrong password.
        hash_password(password)
    if account is None or not password_matches(password, account.password_hash):
        raise AppError(401, "wrong_sign_in", "That username or password is wrong. Try again.")
    session.execute(delete(LoginSession).where(LoginSession.expires_at <= now))
    return start_login_session(session, account, now)


def sign_out(session: Session, secret: str | None) -> None:
    """End this device's login session."""
    if secret is not None:
        ending = delete(LoginSession).where(LoginSession.secret_hash == hash_secret(secret))
        session.execute(ending)


def change_own_password(
    session: Session, account_id: str, current: str, new: str, now: datetime
) -> None:
    """Set a new password for the signed-in account, after checking its current one."""
    account = session.get_one(Account, account_id)
    if not password_matches(current, account.password_hash):
        raise AppError(401, "wrong_password", "That current password is wrong. Try again.")
    account.password_hash = hash_password(new)
    account.updated_at = now
