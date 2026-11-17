from dataclasses import dataclass
from typing import Annotated, Self

from pydantic import BaseModel, StringConstraints, model_validator
from pydantic_core import PydanticCustomError

from app.models import LocationType

LocationName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class NewLocation(BaseModel):
    name: LocationName
    type: LocationType
    parent_id: str | None = None
    summary: str | None = None

    @model_validator(mode="after")
    def only_sites_have_no_parent(self) -> Self:
        if (self.parent_id is None) != (self.type == LocationType.site):
            raise PydanticCustomError(
                "site_parent", "A site has no parent, and every other location has one."
            )
        return self


class PathStep(BaseModel):
    id: str
    name: str
    type: LocationType
    label_code: str | None


class Location(BaseModel):
    id: str
    name: str
    type: LocationType
    parent_id: str | None
    summary: str | None
    label_code: str | None
    path: list[PathStep]
    direct_item_count: int
    item_count: int


class LocationCreated(Location):
    history_entry_id: str


class LocationTree(BaseModel):
    locations: list[Location]


@dataclass(frozen=True)
class SearchableLocation:
    """What search scores a location on: its name, summary and label's code."""

    id: str
    name: str
    summary: str | None
    label_code: str | None
