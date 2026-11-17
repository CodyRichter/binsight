from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class Item(Model):
    __tablename__ = "item"
    __table_args__ = (CheckConstraint("quantity >= 0", name="quantity_not_negative"),)

    id: Mapped[str] = mapped_column(primary_key=True)
    # A photo stands in for the name until the item is given one.
    name: Mapped[str | None]
    quantity: Mapped[int] = mapped_column(default=1)
    home_location_id: Mapped[str | None] = mapped_column(ForeignKey("location.id"), index=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
