from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Model


class ItemStatus(StrEnum):
    in_place = "in_place"
    missing = "missing"


class ItemTag(Model):
    __tablename__ = "item_tag"

    item_id: Mapped[str] = mapped_column(ForeignKey("item.id"), primary_key=True)
    tag: Mapped[str] = mapped_column(primary_key=True, index=True)


class Item(Model):
    __tablename__ = "item"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="quantity_not_negative"),
        CheckConstraint("price_cents >= 0", name="price_not_negative"),
    )

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
    category_id: Mapped[str | None] = mapped_column(ForeignKey("category.id"), index=True)
    notes: Mapped[str | None]
    brand: Mapped[str | None]
    model: Mapped[str | None]
    serial_number: Mapped[str | None]
    purchase_date: Mapped[date | None]
    price_cents: Mapped[int | None]
    order_link: Mapped[str | None]
    warranty_ends: Mapped[date | None]
    return_ends: Mapped[date | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    deleted_at: Mapped[datetime | None]
    tag_rows: Mapped[list[ItemTag]] = relationship(
        cascade="all, delete-orphan", order_by=ItemTag.tag
    )

    @property
    def tags(self) -> list[str]:
        return [row.tag for row in self.tag_rows]

    @tags.setter
    def tags(self, tags: list[str]) -> None:
        # Undo sets tags back by name, so the rows follow the list it is given.
        kept = {row.tag: row for row in self.tag_rows}
        self.tag_rows = [kept.get(tag) or ItemTag(tag=tag) for tag in sorted(tags)]
