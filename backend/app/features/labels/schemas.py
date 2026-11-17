from datetime import datetime

from pydantic import BaseModel, Field


class Label(BaseModel):
    code: str
    location_id: str | None
    claimed_at: datetime | None
    created_at: datetime


class NewBlankLabels(BaseModel):
    count: int = Field(ge=1, le=100)


class BlankLabelsCreated(BaseModel):
    labels: list[Label]
    history_entry_id: str


class LabelClaim(BaseModel):
    location_id: str


class LabelClaimed(Label):
    history_entry_id: str


class LabelImage(BaseModel):
    code: str
    png: bytes


class LabelUnclaimed(Label):
    history_entry_id: str
