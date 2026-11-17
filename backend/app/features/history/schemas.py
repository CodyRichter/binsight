from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.models import Actor

RecordType = Literal["item", "location"]


class HistoryChange(BaseModel):
    record_type: RecordType
    record_id: str
    before: dict[str, Any] | None
    after: dict[str, Any]


class HistoryEntry(BaseModel):
    id: str
    at: datetime
    actor: Actor
    action: str
    changes: list[HistoryChange]
