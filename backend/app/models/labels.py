from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class Label(Model):
    __tablename__ = "label"

    id: Mapped[str] = mapped_column(primary_key=True)
    number: Mapped[int] = mapped_column(unique=True)
    code: Mapped[str] = mapped_column(unique=True)
    # Unique, so a location has at most one label; a blank label has none.
    location_id: Mapped[str | None] = mapped_column(ForeignKey("location.id"), unique=True)
    claimed_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
