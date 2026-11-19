from collections import defaultdict

from sqlalchemy.orm import Session

from app.features.import_export.schemas import ContentsSheet, SheetGroup, SheetItem
from app.features.items import service as items
from app.features.locations import service as locations
from app.features.locations.service import Location


def _tree_order(top: Location, inside: list[Location]) -> list[Location]:
    children: defaultdict[str, list[Location]] = defaultdict(list)
    for place in inside:
        if place.parent_id is not None:
            children[place.parent_id].append(place)
    ordered, waiting = [], [top]
    while waiting:
        current = waiting.pop()
        ordered.append(current)
        # Reversed so the first made of each location's children is printed first.
        waiting.extend(reversed(children[current.id]))
    return ordered


def get_contents_sheet(session: Session, location_id: str) -> ContentsSheet:
    """A location's contents to print: its own items, then each location inside it with its own."""
    within = locations.location_ids_within(session, location_id)
    inside = [place for place in locations.list_locations(session).locations if place.id in within]
    held: defaultdict[str, list[SheetItem]] = defaultdict(list)
    for item in items.list_items_in(session, within):
        if item.home_location_id is not None:
            held[item.home_location_id].append(
                SheetItem(id=item.id, name=item.name, quantity=item.quantity, status=item.status)
            )
    top = next(place for place in inside if place.id == location_id)
    groups = [
        SheetGroup(location_id=place.id, path=place.path, items=held[place.id])
        for place in _tree_order(top, inside)
    ]
    return ContentsSheet(location=top, groups=groups)
