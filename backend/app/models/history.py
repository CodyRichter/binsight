from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Model


class Actor(StrEnum):
    app = "app"
    mcp = "mcp"


class HistoryEntry(Model):
    __tablename__ = "history_entry"

    id: Mapped[str] = mapped_column(primary_key=True)
    at: Mapped[datetime]
    actor: Mapped[Actor] = mapped_column(
        Enum(
            Actor,
            native_enum=False,
            values_callable=lambda actors: [actor.value for actor in actors],
        )
    )
    action: Mapped[str]

    changes: Mapped[list[HistoryChange]] = relationship()


class HistoryChange(Model):
    __tablename__ = "history_change"

    id: Mapped[str] = mapped_column(primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("history_entry.id"), index=True)
    record_type: Mapped[str]
    record_id: Mapped[str] = mapped_column(index=True)
    before: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after: Mapped[dict[str, Any]] = mapped_column(JSON)
