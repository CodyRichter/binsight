from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, func, or_, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.models.base import Model
from app.models.items import ARCHIVED, Item


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

    # The location's code, such as K7Q-4MZ: printed on its label and in its address.
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
        .where(
            Item.home_location_id == id,
            Item.deleted_at.is_(None),
            Item.status.not_in(ARCHIVED),
            # A location's own item is the location itself, not something in it.
            or_(Item.own_item_of.is_(None), Item.own_item_of != id),
        )
        .correlate_except(Item)
        .scalar_subquery()
    )
    own_item_id: Mapped[str | None] = column_property(
        select(Item.id)
        .where(Item.own_item_of == id, Item.deleted_at.is_(None))
        .correlate_except(Item)
        .scalar_subquery()
    )
    # The own item still counts toward the locations around it, as a desk counts in its room.
    counted_own_items: Mapped[int] = column_property(
        select(func.count(Item.id))
        .where(Item.own_item_of == id, Item.deleted_at.is_(None), Item.status.not_in(ARCHIVED))
        .correlate_except(Item)
        .scalar_subquery()
    )
