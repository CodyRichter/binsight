from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, StringConstraints, model_validator

from app.features.items.service import ItemView
from app.features.search.service import Search

ViewName = ItemView | Literal["recently-moved"]


class ViewSummary(BaseModel):
    view: ViewName
    title: str
    count: int


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
