from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class SavedSearch(Model):
    __tablename__ = "saved_search"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    query: Mapped[str]
    # Each filter is left null when the search doesn't use it.
    location_id: Mapped[str | None]
    category: Mapped[str | None]
    tag: Mapped[str | None]
    status: Mapped[str | None]
    warranty: Mapped[str | None]
    pinned: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
