from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class LinkKind(StrEnum):
    belongs_with = "belongs_with"
    part_of = "part_of"


class ItemLink(Model):
    __tablename__ = "item_link"
    __table_args__ = (
        UniqueConstraint("item_id", "other_item_id", "kind", name="one_link_of_each_kind"),
        CheckConstraint("item_id != other_item_id", name="links_two_items"),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    # For part_of, item_id is the part. Belongs_with is stored with the smaller id first.
    item_id: Mapped[str] = mapped_column(ForeignKey("item.id"), index=True)
    other_item_id: Mapped[str] = mapped_column(ForeignKey("item.id"), index=True)
    kind: Mapped[LinkKind] = mapped_column(
        Enum(
            LinkKind,
            native_enum=False,
            values_callable=lambda kinds: [kind.value for kind in kinds],
        )
    )
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
