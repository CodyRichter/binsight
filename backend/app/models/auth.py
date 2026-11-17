from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Model


class Owner(Model):
    __tablename__ = "owner"

    id: Mapped[str] = mapped_column(primary_key=True)
    password_hash: Mapped[str]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]


class LoginSession(Model):
    __tablename__ = "login_session"

    id: Mapped[str] = mapped_column(primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owner.id"))
    secret_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    expires_at: Mapped[datetime]

    owner: Mapped[Owner] = relationship()


class McpCredential(Model):
    __tablename__ = "mcp_credential"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    secret_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
