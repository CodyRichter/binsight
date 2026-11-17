from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.core.identifiers import new_identifier
from app.features.history.schemas import RecordType
from app.models import Actor


@dataclass(frozen=True)
class RecordChange:
    """One record's changed fields, before and after; `before` is None for a create."""

    record_type: RecordType
    record_id: str
    before: dict[str, Any] | None
    after: dict[str, Any]


def record(
    session: Session, actor: Actor, action: str, changes: list[RecordChange], now: datetime
) -> str:
    """Write down one change to the home, so it shows in history and can be undone."""
    entry = models.HistoryEntry(id=new_identifier(), at=now, actor=actor, action=action)
    entry.changes = [
        models.HistoryChange(
            id=new_identifier(),
            record_type=change.record_type,
            record_id=change.record_id,
            before=change.before,
            after=change.after,
        )
        for change in changes
    ]
    session.add(entry)
    return entry.id
