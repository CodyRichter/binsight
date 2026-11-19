from sqlalchemy.orm import Session

from app import models
from app.core.pagination import Page
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


def refuse_deleted_home(session: Session, home_location_id: str | None) -> None:
    """Refuse putting an item in a location that has been deleted, or does not exist."""
    if home_location_id is not None:
        locations.live_location_path(session, home_location_id)


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
        lent_to=item.lent_to,
        lent_at=item.lent_at,
        retired_at=item.retired_at,
        path=path_of(session, item.home_location_id),
        photo_url=attachments.photo_url(session, item.id),
        created_at=item.created_at,
        deleted_at=item.deleted_at,
    )


def item_for(item: Item, visitor: bool) -> Item:
    """The item as someone sees it: a visitor, not signed in, sees none of its private details."""
    if not visitor:
        return item
    return item.model_copy(update={"serial_number": None, "price_cents": None, "order_link": None})


def page_for(page: Page[Item], visitor: bool) -> Page[Item]:
    """A page of items as someone sees them, private details left out for a visitor."""
    return Page(
        items=[item_for(item, visitor) for item in page.items], next_cursor=page.next_cursor
    )
