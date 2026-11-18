import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier

LIFETIME = timedelta(minutes=10)


@dataclass(frozen=True)
class IssuedConfirmation:
    token: str
    expires_at: datetime


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue(session: Session, tool: str, inputs: dict[str, Any], now: datetime) -> IssuedConfirmation:
    """Hand out a token that lets this tool act once with exactly these inputs, for ten minutes."""
    token = secrets.token_urlsafe(32)
    expires_at = now + LIFETIME
    session.add(
        models.Confirmation(
            id=new_identifier(),
            tool=tool,
            inputs=inputs,
            token_hash=_hash(token),
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
    )
    return IssuedConfirmation(token, expires_at)


def redeem(session: Session, tool: str, inputs: dict[str, Any], token: str, now: datetime) -> None:
    """Use up a token issued for this tool and these inputs, or refuse."""
    query = select(models.Confirmation).where(models.Confirmation.token_hash == _hash(token))
    confirmation = session.scalars(query).one_or_none()
    if confirmation is None or confirmation.tool != tool or confirmation.inputs != inputs:
        raise AppError(
            409,
            "confirmation_invalid",
            "That confirmation token is not for this action, or has been used. Ask again.",
        )
    if confirmation.expires_at <= now:
        raise AppError(
            409, "confirmation_expired", "That confirmation token has expired. Ask again."
        )
    session.delete(confirmation)
