import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import and_, delete, exists, or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.auth.passwords import hash_password, password_matches
from app.features.auth.schemas import AuthStatus, McpCredential, McpCredentialCreated
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


def _credential(row: models.McpCredential) -> McpCredential:
    return McpCredential(id=row.id, name=row.name, created_at=row.created_at)


def create_mcp_credential(session: Session, name: str, now: datetime) -> McpCredentialCreated:
    """Make a credential for one Claude client; its secret is shown only in this answer."""
    secret = secrets.token_urlsafe(32)
    row = models.McpCredential(
        id=new_identifier(),
        name=name,
        secret_hash=_hash_secret(secret),
        created_at=now,
        updated_at=now,
        revoked_at=None,
    )
    session.add(row)
    return McpCredentialCreated(**_credential(row).model_dump(), secret=secret)


def list_mcp_credentials(session: Session, limit: int, cursor: str | None) -> Page[McpCredential]:
    """The MCP credentials still in use, newest first."""
    newest_first = (
        select(models.McpCredential)
        .where(models.McpCredential.revoked_at.is_(None))
        .order_by(models.McpCredential.created_at.desc(), models.McpCredential.id.desc())
        .limit(limit + 1)
    )
    if cursor is not None:
        at, identifier = decode_cursor(cursor)
        created_at, credential_id = models.McpCredential.created_at, models.McpCredential.id
        older = or_(created_at < at, and_(created_at == at, credential_id < identifier))
        newest_first = newest_first.where(older)
    rows = list(session.scalars(newest_first))
    last = rows[limit - 1] if len(rows) > limit else None
    return Page(
        items=[_credential(row) for row in rows[:limit]],
        next_cursor=encode_cursor(last.created_at, last.id) if last else None,
    )


def revoke_mcp_credential(session: Session, credential_id: str, now: datetime) -> None:
    """Stop an MCP credential working, so the client holding it is refused from now on."""
    row = session.get(models.McpCredential, credential_id)
    if row is None or row.revoked_at is not None:
        raise AppError(404, "mcp_credential_not_found", "That MCP credential does not exist.")
    row.revoked_at = now
    row.updated_at = now


def is_mcp_credential(session: Session, secret: str) -> bool:
    """Whether a bearer secret belongs to an MCP credential that has not been revoked."""
    current = (
        exists()
        .where(models.McpCredential.secret_hash == _hash_secret(secret))
        .where(models.McpCredential.revoked_at.is_(None))
    )
    return bool(session.scalar(select(current)))
