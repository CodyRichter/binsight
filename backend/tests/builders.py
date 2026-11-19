"""Make locations and items for tests, through the same service functions the app uses."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.features.items import service as items
from app.features.items.schemas import ItemChanges, ItemCreated, NewItem
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


@dataclass(frozen=True)
class AcceptanceHome:
    """The identifiers of the setup every flow in docs/acceptance.md starts from."""

    home: str
    garage: str
    shelf: str
    cables: str
    tools: str
    hdmi_cable: str
    usb_c_charger: str


def acceptance_home(session: Session) -> AcceptanceHome:
    """Home > Garage > Shelf 2 > Cables and Tools; Cables holds the two items."""
    minute = [NOW + timedelta(minutes=step) for step in range(8)]
    home = location(session, "Home", now=minute[0]).id
    garage = location(session, "Garage", home, LocationType.room, minute[1]).id
    shelf = location(session, "Shelf 2", garage, LocationType.shelf, minute[2]).id
    cables = location(session, "Cables", shelf, now=minute[3]).id
    tools = location(session, "Tools", shelf, now=minute[4]).id
    hdmi_cable = item(session, "HDMI cable", cables, minute[5]).id
    items.update_item(session, hdmi_cable, ItemChanges(quantity=3), Actor.app, minute[6])
    usb_c_charger = item(session, "USB-C charger", cables, minute[7]).id
    return AcceptanceHome(home, garage, shelf, cables, tools, hdmi_cable, usb_c_charger)
