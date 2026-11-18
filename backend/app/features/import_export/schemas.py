from dataclasses import dataclass
from datetime import date, datetime

from pydantic import BaseModel

from app.features.items.service import ImportedItem
from app.features.locations.service import Location, PathStep
from app.models import ItemStatus

# The import's columns, in the order the export writes them.
COLUMNS = (
    "name",
    "quantity",
    "location",
    "category",
    "tags",
    "notes",
    "brand",
    "model",
    "serial_number",
    "purchase_date",
    "price",
    "order_link",
    "warranty_ends",
    "return_ends",
    "status",
    "lent_to",
)


class ImportProblem(BaseModel):
    """What is wrong in one cell, or one row when column is null, counting the header as row 1."""

    row: int
    column: str | None
    message: str


@dataclass(frozen=True)
class ImportRow:
    """One valid row: the item, and the steps of the path to the location it goes in."""

    row: int
    item: ImportedItem
    path: tuple[str, ...]


class ImportPreview(BaseModel):
    items_to_create: int
    locations_to_create: list[str]
    first_item_names: list[str]


class ImportDone(BaseModel):
    items_created: int
    locations_created: int
    history_entry_id: str


class Receipt(BaseModel):
    """A file or web link attached to an item, by its name, or a link by its address if unnamed."""

    name: str
    url: str


class InsuredItem(BaseModel):
    id: str
    name: str | None
    quantity: int
    status: ItemStatus
    path: list[PathStep]
    brand: str | None
    model: str | None
    serial_number: str | None
    purchase_date: date | None
    price_cents: int | None
    order_link: str | None
    photo_urls: list[str]
    receipts: list[Receipt]


class InsuranceList(BaseModel):
    """Every item still owned in the home or one location, with what a claim would ask for."""

    title: str
    path: list[PathStep]
    made_at: datetime
    item_count: int
    total_cents: int
    items_without_price: int
    items: list[InsuredItem]


class SheetItem(BaseModel):
    id: str
    name: str | None
    quantity: int
    status: ItemStatus


class SheetGroup(BaseModel):
    """One location on a contents sheet, with the items kept directly in it."""

    location_id: str
    path: list[PathStep]
    label_code: str | None
    items: list[SheetItem]


class ContentsSheet(BaseModel):
    """A location and everything in it, grouped by the location each item is kept in."""

    location: Location
    groups: list[SheetGroup]
