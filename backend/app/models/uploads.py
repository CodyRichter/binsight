from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model


class Upload(Model):
    __tablename__ = "upload"

    id: Mapped[str] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(unique=True)
    path: Mapped[str | None]
    size: Mapped[int | None]
    expires_at: Mapped[datetime]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
