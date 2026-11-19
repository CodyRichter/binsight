from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Model


class ActorKind(StrEnum):
    app = "app"
    mcp = "mcp"


@dataclass(frozen=True)
class Actor:
    """Who is making a change: an account in the app, by its username, or Claude."""

    kind: ActorKind
    username: str | None = None


MCP_ACTOR = Actor(ActorKind.mcp)


class HistoryEntry(Model):
    __tablename__ = "history_entry"

    id: Mapped[str] = mapped_column(primary_key=True)
    at: Mapped[datetime]
    actor: Mapped[ActorKind] = mapped_column(
        Enum(
            ActorKind,
            name="actor",
            native_enum=False,
            values_callable=lambda actors: [actor.value for actor in actors],
        )
    )
    username: Mapped[str | None]
    action: Mapped[str]
    # The entry that undid this one; history is append-only, so the undo is an entry too.
    undone_by: Mapped[str | None] = mapped_column(ForeignKey("history_entry.id"))

    changes: Mapped[list[HistoryChange]] = relationship(foreign_keys="HistoryChange.entry_id")


class HistoryChange(Model):
    __tablename__ = "history_change"

    id: Mapped[str] = mapped_column(primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("history_entry.id"), index=True)
    record_type: Mapped[str]
    record_id: Mapped[str] = mapped_column(index=True)
    before: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after: Mapped[dict[str, Any]] = mapped_column(JSON)
