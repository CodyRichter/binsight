from datetime import datetime

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model
from app.models.history import Actor


class Check(Model):
    __tablename__ = "check"

    id: Mapped[str] = mapped_column(primary_key=True)
    location_id: Mapped[str] = mapped_column(ForeignKey("location.id"), index=True)
    checked_at: Mapped[datetime]
    actor: Mapped[Actor] = mapped_column(
        Enum(
            Actor,
            native_enum=False,
            values_callable=lambda actors: [actor.value for actor in actors],
        )
    )
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
