from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class Confirmation(Model):
    __tablename__ = "confirmation"

    id: Mapped[str] = mapped_column(primary_key=True)
    tool: Mapped[str]
    inputs: Mapped[dict[str, Any]] = mapped_column(JSON)
    token_hash: Mapped[str] = mapped_column(unique=True)
    expires_at: Mapped[datetime]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
