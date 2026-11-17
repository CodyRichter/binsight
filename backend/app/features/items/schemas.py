from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.features.locations.service import PathStep

ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class NewItem(BaseModel):
    name: ItemName
    home_location_id: str | None = None


class NewItems(BaseModel):
    names: list[ItemName] = Field(min_length=1, max_length=100)
    home_location_id: str | None = None


class ItemChanges(BaseModel):
    name: ItemName | None = None
    quantity: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _names_are_never_cleared(self) -> Self:
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("An item's name can be changed but not cleared.")
        if self.name is None and self.quantity is None:
            raise ValueError("Give a name or a quantity to change.")
        return self


class Item(BaseModel):
    id: str
    name: str | None
    quantity: int
    home_location_id: str | None
    path: list[PathStep]
    photo_url: str | None
    created_at: datetime


class ItemCreated(Item):
    history_entry_id: str


class ItemsCreated(BaseModel):
    items: list[Item]
    history_entry_id: str


class ItemUpdated(Item):
    history_entry_id: str


class InboxCount(BaseModel):
    count: int


@dataclass(frozen=True)
class SearchableItem:
    """What search scores an item on: its name."""

    id: str
    name: str
