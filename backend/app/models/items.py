from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class ItemStatus(StrEnum):
    in_place = "in_place"
    missing = "missing"


class Item(Model):
    __tablename__ = "item"
    __table_args__ = (CheckConstraint("quantity >= 0", name="quantity_not_negative"),)

    id: Mapped[str] = mapped_column(primary_key=True)
    # A photo stands in for the name until the item is given one.
    name: Mapped[str | None]
    quantity: Mapped[int] = mapped_column(default=1)
    home_location_id: Mapped[str | None] = mapped_column(ForeignKey("location.id"), index=True)
    status: Mapped[ItemStatus] = mapped_column(
        Enum(
            ItemStatus,
            native_enum=False,
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        default=ItemStatus.in_place,
    )
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    deleted_at: Mapped[datetime | None]
