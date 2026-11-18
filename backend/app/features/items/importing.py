from datetime import date, datetime
from enum import Enum

from sqlalchemy.orm import Session

from app import models
from app.core.identifiers import new_identifier
from app.features.history import service as history
from app.features.items.categories import category_for
from app.features.items.schemas import ImportedItem
from app.models import ARCHIVED, ItemStatus

RECORDED = (
    "name",
    "quantity",
    "home_location_id",
    "status",
    "category_id",
    "tags",
    "notes",
    "brand",
    "model",
    "serial_number",
    "purchase_date",
    "price_cents",
    "order_link",
    "warranty_ends",
    "return_ends",
    "lent_to",
    "lent_at",
    "retired_at",
)


def _recorded(value: object) -> object:
    # History is JSON, so statuses are kept as their names and times and dates as ISO text.
    if isinstance(value, Enum):
        return value.value
    return value.isoformat() if isinstance(value, date) else value


def make_item(session: Session, new: ImportedItem, now: datetime) -> history.RecordChange:
    """Add an item with its details, leaving the caller to record it with the rest of its action."""
    fields = new.model_dump(exclude={"category"})
    category_id = category_for(session, new.category, now) if new.category else None
    item = models.Item(
        id=new_identifier(),
        **fields,
        category_id=category_id,
        lent_at=now if new.status == ItemStatus.lent_out else None,
        retired_at=now if new.status in ARCHIVED else None,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    session.flush()
    after = {field: _recorded(getattr(item, field)) for field in RECORDED}
    return history.RecordChange("item", item.id, None, after)
