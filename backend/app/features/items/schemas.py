from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Self

from pydantic import AfterValidator, BaseModel, Field, StringConstraints, model_validator

from app.features.locations.service import PathStep
from app.models import ItemStatus

ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class NewItem(BaseModel):
    name: ItemName
    home_location_id: str | None = None


class NewItems(BaseModel):
    names: list[ItemName] = Field(min_length=1, max_length=100)
    home_location_id: str | None = None


DetailText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
OrderLink = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=2000, pattern=r"^https?://\S+$")
]
TagName = Annotated[
    str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=50)
]


def _each_once(tags: list[str]) -> list[str]:
    return sorted(set(tags))


class ItemChanges(BaseModel):
    """What to change on an item; a detail given as null is cleared."""

    name: ItemName | None = None
    quantity: int | None = Field(default=None, ge=0)
    category: DetailText | None = None
    tags: Annotated[list[TagName], AfterValidator(_each_once)] | None = Field(
        default=None, max_length=50
    )
    notes: Notes | None = None
    brand: DetailText | None = None
    model: DetailText | None = None
    serial_number: DetailText | None = None
    purchase_date: date | None = None
    price_cents: int | None = Field(default=None, ge=0)
    order_link: OrderLink | None = None
    warranty_ends: date | None = None
    return_ends: date | None = None

    @model_validator(mode="after")
    def _only_details_are_cleared(self) -> Self:
        for field in ("name", "quantity", "tags"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"An item's {field} can be changed but not cleared.")
        if not self.model_fields_set:
            raise ValueError("Give something to change.")
        return self


class ItemMove(BaseModel):
    location_id: str


class Item(BaseModel):
    id: str
    name: str | None
    quantity: int
    home_location_id: str | None
    status: ItemStatus
    category: str | None
    tags: list[str]
    notes: str | None
    brand: str | None
    model: str | None
    serial_number: str | None
    purchase_date: date | None
    price_cents: int | None
    order_link: str | None
    warranty_ends: date | None
    return_ends: date | None
    path: list[PathStep]
    last_checked_at: datetime | None
    photo_url: str | None
    created_at: datetime
    deleted_at: datetime | None


class ItemCreated(Item):
    history_entry_id: str


class ItemsCreated(BaseModel):
    items: list[Item]
    history_entry_id: str


class ItemUpdated(Item):
    history_entry_id: str


class ItemMoved(Item):
    history_entry_id: str


class ItemFound(BaseModel):
    location_id: str


class ItemMarkedMissing(Item):
    history_entry_id: str


class ItemMarkedFound(Item):
    history_entry_id: str


class ItemDeleted(Item):
    history_entry_id: str


class ItemRestored(Item):
    history_entry_id: str


class InboxCount(BaseModel):
    count: int


class Category(BaseModel):
    name: str
    item_count: int


class Tag(BaseModel):
    name: str
    item_count: int


@dataclass(frozen=True)
class SearchableItem:
    """What search scores an item on: its name, and the words of its details and tags."""

    id: str
    name: str
    details: str
