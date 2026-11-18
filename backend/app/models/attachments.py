from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class AttachmentKind(StrEnum):
    photo = "photo"
    file = "file"
    link = "link"


class Attachment(Model):
    __tablename__ = "attachment"
    __table_args__ = (
        CheckConstraint("(item_id IS NULL) != (location_id IS NULL)", name="one_owner"),
        CheckConstraint("location_id IS NULL OR kind = 'photo'", name="locations_take_photos"),
        CheckConstraint(
            "(kind = 'link') = (url IS NOT NULL) AND (kind = 'link') = (path IS NULL)",
            name="a_link_has_no_file",
        ),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item.id"), index=True)
    location_id: Mapped[str | None] = mapped_column(ForeignKey("location.id"), index=True)
    kind: Mapped[AttachmentKind] = mapped_column(
        Enum(
            AttachmentKind,
            native_enum=False,
            values_callable=lambda kinds: [kind.value for kind in kinds],
        )
    )
    # Relative to the data directory; the file's name is made by the app, never uploaded.
    path: Mapped[str | None]
    url: Mapped[str | None]
    filename: Mapped[str | None]
    content_type: Mapped[str | None]
    size: Mapped[int | None]
    position: Mapped[int]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
