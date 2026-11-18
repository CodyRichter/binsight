from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.features.items.service import Item, ItemView
from app.features.locations.service import Location
from app.features.search.service import Search

ViewName = ItemView | Literal["recently-moved", "not-checked"]


class ViewSummary(BaseModel):
    view: ViewName
    title: str
    count: int


class ViewItem(BaseModel):
    kind: Literal["item"]
    item: Item


class ViewLocation(BaseModel):
    kind: Literal["location"]
    location: Location


ViewRow = Annotated[ViewItem | ViewLocation, Field(discriminator="kind")]

SavedSearchName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]


class NewSavedSearch(Search):
    name: SavedSearchName


class SavedSearch(Search):
    id: str
    name: str
    pinned: bool
    # How many results it finds now, so a list of saved searches shows each one's count.
    count: int
    created_at: datetime


class SavedSearchChanges(BaseModel):
    name: SavedSearchName | None = None
    pinned: bool | None = None

    @model_validator(mode="after")
    def _something_changes(self) -> Self:
        if not self.model_dump(exclude_none=True):
            raise ValueError("Give a name or whether it is pinned.")
        return self


class SavedSearchCreated(SavedSearch):
    history_entry_id: str


class SavedSearchUpdated(SavedSearch):
    history_entry_id: str


class SavedSearchDeleted(BaseModel):
    history_entry_id: str
