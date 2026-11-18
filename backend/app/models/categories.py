from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class Category(Model):
    __tablename__ = "category"

    id: Mapped[str] = mapped_column(primary_key=True)
    # Unique ignoring case; the categories service finds a name before making it.
    name: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
