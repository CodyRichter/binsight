from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

from app.features.items.schemas import DetailText, Item, TagName


def _each_once(item_ids: list[str]) -> list[str]:
    return list(dict.fromkeys(item_ids))


ItemIds = Annotated[list[str], Field(min_length=1, max_length=500), AfterValidator(_each_once)]


class ItemsMove(BaseModel):
    item_ids: ItemIds
    location_id: str


class ItemsTag(BaseModel):
    item_ids: ItemIds
    tag: TagName


class ItemsCategory(BaseModel):
    """The category for every item given; null takes their category away."""

    item_ids: ItemIds
    category: DetailText | None


class ItemsStatus(BaseModel):
    item_ids: ItemIds
    status: Literal["in_place", "in_use", "sold", "given_away", "thrown_away"]


class ItemsChanged(BaseModel):
    """The items a bulk edit changed, leaving out those it found already so."""

    items: list[Item]
    history_entry_id: str
