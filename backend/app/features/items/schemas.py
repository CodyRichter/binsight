from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import AfterValidator, BaseModel, Field, StringConstraints, model_validator

from app.features.attachments.service import Attachment
from app.features.locations.service import PathStep
from app.models import ItemStatus, LinkKind

ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class NewItem(BaseModel):
    name: ItemName
    home_location_id: str | None = None


class NewOwnItem(BaseModel):
    location_id: str


class NewItems(BaseModel):
    names: list[ItemName] = Field(min_length=1, max_length=100)
    home_location_id: str | None = None


DetailText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
WebAddress = Annotated[
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
    order_link: WebAddress | None = None
    warranty_ends: date | None = None
    return_ends: date | None = None
    # A location's code makes the item that location's own item, moving it there; null unlinks.
    own_item_of: str | None = None

    @model_validator(mode="after")
    def _only_details_are_cleared(self) -> Self:
        for field in ("name", "quantity", "tags"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"An item's {field} can be changed but not cleared.")
        if not self.model_fields_set:
            raise ValueError("Give something to change.")
        return self


class ImportedItem(BaseModel):
    """One item from an imported file, with whatever details the file gave it."""

    name: ItemName
    quantity: int = Field(default=1, ge=0)
    home_location_id: str | None = None
    status: ItemStatus = ItemStatus.in_place
    lent_to: DetailText | None = None
    category: DetailText | None = None
    tags: Annotated[list[TagName], AfterValidator(_each_once)] = Field(
        default_factory=list, max_length=50
    )
    notes: Notes | None = None
    brand: DetailText | None = None
    model: DetailText | None = None
    serial_number: DetailText | None = None
    purchase_date: date | None = None
    price_cents: int | None = Field(default=None, ge=0)
    order_link: WebAddress | None = None
    warranty_ends: date | None = None
    return_ends: date | None = None

    @model_validator(mode="after")
    def _lent_to_only_when_lent_out(self) -> Self:
        if (self.status == ItemStatus.lent_out) != (self.lent_to is not None):
            raise ValueError("An item is lent out exactly when it says who it is lent to.")
        return self


class ItemMove(BaseModel):
    location_id: str


class ItemsKept(BaseModel):
    """Which location's items to list, and whether to include those in locations inside it."""

    location_id: str
    everything_inside: bool = False


class Item(BaseModel):
    id: str
    name: str | None
    quantity: int
    home_location_id: str | None
    own_item_of: str | None
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
    lent_to: str | None
    lent_at: datetime | None
    retired_at: datetime | None
    path: list[PathStep]
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


class ItemMerge(BaseModel):
    into: str


class ItemMerged(Item):
    """The item merged into, as it is now."""

    history_entry_id: str


class MergePreview(BaseModel):
    item: Item
    into: Item


class ItemStatusChange(BaseModel):
    """A status to set directly; lending, returning, missing and found have their own."""

    status: Literal["in_place", "in_use", "sold", "given_away", "thrown_away"]


class ItemLending(BaseModel):
    lent_to: ItemName


class ItemStatusChanged(Item):
    history_entry_id: str


class ItemLent(Item):
    history_entry_id: str


class ItemReturned(Item):
    history_entry_id: str


class LentToName(BaseModel):
    name: str


class ItemLinkNew(BaseModel):
    """A link from this item: it belongs with the other, or it is part of the other."""

    other_item_id: str
    kind: LinkKind


class LinkedItem(BaseModel):
    """An item linked to this one; "part" means the linked item is part of this one."""

    link_id: str
    kind: Literal["belongs_with", "part_of", "part"]
    item: Item


class ItemLinked(BaseModel):
    link_id: str
    history_entry_id: str


class ItemUnlinked(BaseModel):
    history_entry_id: str


class NewWebLink(BaseModel):
    url: WebAddress
    name: DetailText | None = None


class AttachmentAdded(Attachment):
    history_entry_id: str


class AttachmentRemoved(Attachment):
    history_entry_id: str


class InboxCount(BaseModel):
    count: int


class Category(BaseModel):
    name: str
    item_count: int


class Tag(BaseModel):
    name: str
    item_count: int


Warranty = Literal["active", "ending_soon", "ended"]


class ItemFilters(BaseModel):
    """Which items a search keeps; a filter left out keeps every item."""

    location_id: str | None = None
    category: DetailText | None = None
    tag: TagName | None = None
    status: ItemStatus | None = None
    warranty: Warranty | None = None

    def any_set(self) -> bool:
        return any(value is not None for value in self.model_dump().values())

    def only_location(self) -> bool:
        return self.model_dump(exclude_none=True).keys() <= {"location_id"}


@dataclass(frozen=True)
class SearchableItem:
    """What search scores an item on: its name, and the words of its details and tags."""

    id: str
    name: str
    details: str
