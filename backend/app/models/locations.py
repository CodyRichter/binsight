from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.models.base import Model
from app.models.items import ARCHIVED, Item
from app.models.labels import Label


class LocationType(StrEnum):
    site = "site"
    room = "room"
    furniture = "furniture"
    shelf = "shelf"
    bin = "bin"
    drawer = "drawer"
    box = "box"


class Location(Model):
    __tablename__ = "location"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    type: Mapped[LocationType] = mapped_column(
        Enum(
            LocationType,
            native_enum=False,
            values_callable=lambda kinds: [kind.value for kind in kinds],
        )
    )
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("location.id"), index=True)
    summary: Mapped[str | None]
    icon: Mapped[str | None]
    position: Mapped[int]
    deleted_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    # Counted here so the locations feature never queries the item table (decision 0003).
    # Archived items keep their home for the record but are not among its contents.
    direct_item_count: Mapped[int] = column_property(
        select(func.count(Item.id))
        .where(Item.home_location_id == id, Item.deleted_at.is_(None), Item.status.not_in(ARCHIVED))
        .correlate_except(Item)
        .scalar_subquery()
    )
    label_code: Mapped[str | None] = column_property(
        select(Label.code).where(Label.location_id == id).correlate_except(Label).scalar_subquery()
    )
