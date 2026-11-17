from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.features.items.service import Item
from app.features.locations.service import Location


class Mark(BaseModel):
    """Where matched text starts and ends in a name, counted in characters."""

    start: int
    end: int


class ItemResult(BaseModel):
    kind: Literal["item"]
    item: Item
    marks: list[Mark]


class LocationResult(BaseModel):
    kind: Literal["location"]
    location: Location
    marks: list[Mark]


SearchResult = Annotated[ItemResult | LocationResult, Field(discriminator="kind")]


class SearchResults(BaseModel):
    results: list[SearchResult]
    next_cursor: str | None
    count: int
