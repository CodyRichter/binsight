"""Make locations and items for tests, through the same service functions the app uses."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.features.items import service as items
from app.features.items.schemas import ItemCreated, NewItem
from app.features.locations import service as locations
from app.features.locations.schemas import LocationCreated, NewLocation
from app.models import Actor, LocationType

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)


def location(
    session: Session,
    name: str = "Home",
    parent_id: str | None = None,
    location_type: LocationType | None = None,
    now: datetime = NOW,
) -> LocationCreated:
    """A site by default, or a bin when given a parent."""
    kind = location_type or (LocationType.site if parent_id is None else LocationType.bin)
    new = NewLocation(name=name, type=kind, parent_id=parent_id)
    return locations.create_location(session, new, Actor.app, now)


def item(
    session: Session,
    name: str = "HDMI cable",
    home_location_id: str | None = None,
    now: datetime = NOW,
) -> ItemCreated:
    """An item, in the inbox unless given a home location."""
    new = NewItem(name=name, home_location_id=home_location_id)
    return items.create_item(session, new, Actor.app, now)
