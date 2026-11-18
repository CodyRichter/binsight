from pydantic import BaseModel, Field

from app.features.items.service import Item
from app.features.locations.service import Location


class CheckLocation(BaseModel):
    missing_item_ids: list[str] = Field(default_factory=list, max_length=200)


class LocationChecked(Location):
    marked_missing: list[Item]
    history_entry_id: str


class CheckPreview(BaseModel):
    location: Location
    marked_missing: list[Item]
