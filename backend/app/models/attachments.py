from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class AttachmentKind(StrEnum):
    photo = "photo"


class Attachment(Model):
    __tablename__ = "attachment"

    id: Mapped[str] = mapped_column(primary_key=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("item.id"), index=True)
    kind: Mapped[AttachmentKind] = mapped_column(
        Enum(
            AttachmentKind,
            native_enum=False,
            values_callable=lambda kinds: [kind.value for kind in kinds],
        )
    )
    # Relative to the data directory; the file's name is made by the app, never uploaded.
    path: Mapped[str]
    filename: Mapped[str | None]
    position: Mapped[int]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
