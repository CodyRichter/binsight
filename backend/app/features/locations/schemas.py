from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator
from pydantic_core import PydanticCustomError

from app.models import LocationType

LocationName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
# A Tabler outline icon's name; the frontend shows the type's icon for one Tabler doesn't have.
IconName = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=64)]


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


class Location(BaseModel):
    id: str
    name: str
    type: LocationType
    parent_id: str | None
    summary: str | None
    icon: str | None
    path: list[PathStep]
    direct_item_count: int
    item_count: int
    photo_url: str | None
    deleted_at: datetime | None


class LocationCreated(Location):
    history_entry_id: str


class LocationPhotoChanged(Location):
    history_entry_id: str


class LocationMove(BaseModel):
    parent_id: str


class LocationMoved(Location):
    history_entry_id: str


class LocationChanges(BaseModel):
    """Only the fields sent are changed; a summary or icon sent as null is cleared."""

    name: LocationName | None = None
    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None
    type: LocationType | None = None
    icon: IconName | None = None

    @model_validator(mode="after")
    def a_name_and_type_are_never_cleared(self) -> Self:
        if "name" in self.model_fields_set and self.name is None:
            raise PydanticCustomError("name_required", "A location always has a name.")
        if "type" in self.model_fields_set and self.type is None:
            raise PydanticCustomError("type_required", "A location always has a type.")
        return self

    @model_validator(mode="after")
    def nothing_becomes_a_site(self) -> Self:
        if self.type == LocationType.site:
            raise PydanticCustomError(
                "site_parent", "Only a location with no parent is a site, and it stays one."
            )
        return self


class LocationUpdated(Location):
    history_entry_id: str


class LocationDelete(BaseModel):
    """Where the location's items and the locations inside it go; none when it is empty."""

    move_contents_to: str | None = None


class LocationDeleted(Location):
    history_entry_id: str


class LocationMerge(BaseModel):
    into: str


class LocationMerged(Location):
    """The location merged into, now holding everything the merged one held."""

    history_entry_id: str


class LocationRestored(Location):
    history_entry_id: str


class LocationReorder(BaseModel):
    """The place among its siblings, counting from 0; past the end means last."""

    position: Annotated[int, Field(ge=0)]


class LocationReordered(Location):
    history_entry_id: str


class RemovalPreview(BaseModel):
    """What deleting or merging a location would move, before it is done."""

    location: Location
    destination: Location | None
    items_moving: int
    locations_moving: int


class LocationTree(BaseModel):
    locations: list[Location]


@dataclass(frozen=True)
class SearchableLocation:
    """What search scores a location on: its code, name and summary."""

    id: str
    name: str
    summary: str | None
