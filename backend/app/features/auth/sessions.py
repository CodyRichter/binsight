import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.identifiers import new_identifier
from app.models import Account, LoginSession

# The longest a browser keeps a cookie; a session is never renewed, because a read never writes.
SESSION_LIFETIME = timedelta(days=400)


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def start_login_session(session: Session, account: Account, now: datetime) -> str:
    secret = secrets.token_urlsafe(32)
    session.add(
        LoginSession(
            id=new_identifier(),
            account=account,
            secret_hash=hash_secret(secret),
            created_at=now,
            updated_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    return secret


def end_login_sessions(session: Session, account_id: str) -> None:
    session.execute(delete(LoginSession).where(LoginSession.account_id == account_id))
