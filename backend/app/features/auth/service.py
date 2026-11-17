import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.features.auth.passwords import hash_password, password_matches
from app.features.auth.schemas import AuthStatus
from app.models import LoginSession, Owner

# The longest a browser keeps a cookie; a session is never renewed, because a read never writes.
SESSION_LIFETIME = timedelta(days=400)


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _owner(session: Session) -> Owner | None:
    return session.scalars(select(Owner)).first()


def _start_login_session(session: Session, owner: Owner, now: datetime) -> str:
    secret = secrets.token_urlsafe(32)
    session.add(
        LoginSession(
            id=new_identifier(),
            owner=owner,
            secret_hash=_hash_secret(secret),
            created_at=now,
            updated_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    return secret


def is_signed_in(session: Session, secret: str | None, now: datetime) -> bool:
    """Whether a session secret belongs to a login session that has not expired."""
    if secret is None:
        return False
    current = (
        exists()
        .where(LoginSession.secret_hash == _hash_secret(secret))
        .where(LoginSession.expires_at > now)
    )
    return bool(session.scalar(select(current)))


def get_auth_status(session: Session, secret: str | None, now: datetime) -> AuthStatus:
    """Say whether the install has an owner yet, and whether this device is signed in."""
    return AuthStatus(
        owner_exists=_owner(session) is not None,
        signed_in=is_signed_in(session, secret, now),
    )


def create_owner(session: Session, password: str, now: datetime) -> str:
    """Set the owner's password on a new install and sign this device in."""
    if _owner(session) is not None:
        raise AppError(409, "owner_exists", "An owner already exists. Sign in instead.")
    owner = Owner(
        id=new_identifier(), password_hash=hash_password(password), created_at=now, updated_at=now
    )
    session.add(owner)
    return _start_login_session(session, owner, now)


def sign_in(session: Session, password: str, now: datetime) -> str:
    """Sign this device in with the owner's password."""
    owner = _owner(session)
    if owner is None:
        raise AppError(409, "owner_not_created", "No password is set yet. Set one first.")
    if not password_matches(password, owner.password_hash):
        raise AppError(401, "wrong_password", "That password is wrong. Try again.")
    session.execute(delete(LoginSession).where(LoginSession.expires_at <= now))
    return _start_login_session(session, owner, now)


def sign_out(session: Session, secret: str | None) -> None:
    """End this device's login session."""
    if secret is not None:
        ending = delete(LoginSession).where(LoginSession.secret_hash == _hash_secret(secret))
        session.execute(ending)
