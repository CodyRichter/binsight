from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.features.history import service as history
from app.features.items.categories import category_for
from app.features.items.schemas import ItemChanges


def _recorded(value: object) -> object:
    # History is JSON, so dates are kept as ISO text.
    return value.isoformat() if isinstance(value, date) else value


def _fields(session: Session, changes: ItemChanges, now: datetime) -> dict[str, Any]:
    fields = changes.model_dump(include=changes.model_fields_set)
    if "category" in fields:
        name = fields.pop("category")
        fields["category_id"] = category_for(session, name, now) if name else None
    return fields


def apply_changes(
    session: Session, item: models.Item, changes: ItemChanges, now: datetime
) -> tuple[str, history.RecordChange]:
    """Set what was given on an item, returning the history action and the change to record."""
    fields = _fields(session, changes, now)
    before = {field: _recorded(getattr(item, field)) for field in fields}
    for field, value in fields.items():
        setattr(item, field, value)
    item.updated_at = now
    after = {field: _recorded(value) for field, value in fields.items()}
    action = "item.named" if fields.keys() == {"name"} else "item.updated"
    return action, history.RecordChange("item", item.id, before, after)
