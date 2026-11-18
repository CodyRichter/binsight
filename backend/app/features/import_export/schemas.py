from dataclasses import dataclass

from pydantic import BaseModel

from app.features.items.service import ImportedItem

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
