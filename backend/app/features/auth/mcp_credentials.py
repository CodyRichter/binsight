import secrets
from datetime import datetime

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.auth.schemas import McpCredential, McpCredentialCreated
from app.features.auth.sessions import hash_secret


def _credential(row: models.McpCredential) -> McpCredential:
    return McpCredential(id=row.id, name=row.name, created_at=row.created_at)


def create_mcp_credential(session: Session, name: str, now: datetime) -> McpCredentialCreated:
    """Make a credential for one Claude client; its secret is shown only in this answer."""
    secret = secrets.token_urlsafe(32)
    row = models.McpCredential(
        id=new_identifier(),
        name=name,
        secret_hash=hash_secret(secret),
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
        .where(models.McpCredential.secret_hash == hash_secret(secret))
        .where(models.McpCredential.revoked_at.is_(None))
    )
    return bool(session.scalar(select(current)))
