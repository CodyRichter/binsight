from datetime import datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.features.auth.passwords import hash_password
from app.features.auth.schemas import Account, AccountChanges, NewAccount
from app.features.auth.sessions import end_login_sessions
from app.models import Role


def shape_account(row: models.Account) -> Account:
    return Account(id=row.id, username=row.username, role=row.role, created_at=row.created_at)


def _row(session: Session, account_id: str) -> models.Account:
    row = session.get(models.Account, account_id)
    if row is None:
        raise AppError(404, "account_not_found", "That account does not exist.")
    return row


def _refuse_taken(session: Session, username: str) -> None:
    if session.scalar(select(models.Account.id).where(models.Account.username == username)):
        raise AppError(409, "username_taken", "That username is taken. Choose another.")


def _refuse_last_admin(session: Session, row: models.Account) -> None:
    admins = select(func.count()).where(models.Account.role == Role.admin)
    if row.role == Role.admin and session.scalar(admins) == 1:
        raise AppError(
            409, "last_admin", "This is the only admin. Make another admin before changing it."
        )


def make_account(session: Session, new: NewAccount, now: datetime) -> models.Account:
    _refuse_taken(session, new.username)
    row = models.Account(
        id=new_identifier(),
        username=new.username,
        password_hash=hash_password(new.password),
        role=new.role,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    return row


def create_account(session: Session, new: NewAccount, now: datetime) -> Account:
    """Make an account for someone in the household, with the role they are given."""
    return shape_account(make_account(session, new, now))


def list_accounts(session: Session, limit: int, cursor: str | None) -> Page[Account]:
    """Every account, oldest first."""
    oldest_first = (
        select(models.Account)
        .order_by(models.Account.created_at, models.Account.id)
        .limit(limit + 1)
    )
    if cursor is not None:
        at, identifier = decode_cursor(cursor)
        created_at, account_id = models.Account.created_at, models.Account.id
        newer = or_(created_at > at, and_(created_at == at, account_id > identifier))
        oldest_first = oldest_first.where(newer)
    rows = list(session.scalars(oldest_first))
    last = rows[limit - 1] if len(rows) > limit else None
    return Page(
        items=[shape_account(row) for row in rows[:limit]],
        next_cursor=encode_cursor(last.created_at, last.id) if last else None,
    )


def update_account(
    session: Session, account_id: str, changes: AccountChanges, now: datetime
) -> Account:
    """Change an account's role, or set a new password, which signs it out everywhere."""
    row = _row(session, account_id)
    if changes.role is not None and changes.role != row.role:
        _refuse_last_admin(session, row)
        row.role = changes.role
    if changes.password is not None:
        row.password_hash = hash_password(changes.password)
        end_login_sessions(session, row.id)
    row.updated_at = now
    return shape_account(row)


def delete_account(session: Session, account_id: str) -> None:
    """Remove an account and sign it out everywhere; its changes keep its username in history."""
    row = _row(session, account_id)
    _refuse_last_admin(session, row)
    end_login_sessions(session, row.id)
    session.delete(row)
