from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Model


class Role(StrEnum):
    viewer = "viewer"
    editor = "editor"
    admin = "admin"


class Account(Model):
    __tablename__ = "account"

    id: Mapped[str] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str]
    role: Mapped[Role] = mapped_column(
        Enum(Role, native_enum=False, values_callable=lambda roles: [role.value for role in roles])
    )
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]


class LoginSession(Model):
    __tablename__ = "login_session"

    id: Mapped[str] = mapped_column(primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("account.id"), index=True)
    secret_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    expires_at: Mapped[datetime]

    account: Mapped[Account] = relationship()


class McpCredential(Model):
    __tablename__ = "mcp_credential"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    secret_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
