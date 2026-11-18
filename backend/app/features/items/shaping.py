from sqlalchemy.orm import Session

from app import models
from app.features.attachments import service as attachments
from app.features.items.categories import category_name
from app.features.items.schemas import Item
from app.features.locations import service as locations
from app.features.locations.service import PathStep


def path_of(session: Session, home_location_id: str | None) -> list[PathStep]:
    """The path from the site down to an item's home; empty for an item in the inbox."""
    if home_location_id is None:
        return []
    return locations.location_path(session, home_location_id)


def shaped(session: Session, item: models.Item) -> Item:
    """An item as the API answers with it: its details, its path and its picture."""
    return Item(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        home_location_id=item.home_location_id,
        status=item.status,
        category=category_name(session, item.category_id),
        tags=item.tags,
        notes=item.notes,
        brand=item.brand,
        model=item.model,
        serial_number=item.serial_number,
        purchase_date=item.purchase_date,
        price_cents=item.price_cents,
        order_link=item.order_link,
        warranty_ends=item.warranty_ends,
        return_ends=item.return_ends,
        path=path_of(session, item.home_location_id),
        last_checked_at=(
            locations.last_checked_at(session, item.home_location_id)
            if item.home_location_id
            else None
        ),
        photo_url=attachments.photo_url(session, item.id),
        created_at=item.created_at,
        deleted_at=item.deleted_at,
    )
