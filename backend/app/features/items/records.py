from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError


def item_record(session: Session, item_id: str) -> models.Item:
    """The item's row, even when it has been deleted."""
    item = session.get(models.Item, item_id)
    if item is None:
        raise AppError(404, "item_not_found", "That item does not exist.")
    return item


def live_item(session: Session, item_id: str) -> models.Item:
    """The item's row, refused once it has been deleted."""
    item = item_record(session, item_id)
    if item.deleted_at is not None:
        raise AppError(409, "item_deleted", "That item has been deleted. Restore it first.")
    return item
