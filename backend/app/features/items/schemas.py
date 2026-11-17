from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.features.locations.service import PathStep

ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class NewItem(BaseModel):
    name: ItemName
    home_location_id: str | None = None


class ItemChanges(BaseModel):
    quantity: int = Field(ge=0)


class Item(BaseModel):
    id: str
    name: str | None
    quantity: int
    home_location_id: str | None
    path: list[PathStep]
    created_at: datetime


class ItemCreated(Item):
    history_entry_id: str


class ItemUpdated(Item):
    history_entry_id: str
