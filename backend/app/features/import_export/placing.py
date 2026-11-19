import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.features.import_export.schemas import ImportProblem, ImportRow
from app.features.locations import service as locations
from app.models import LocationType

# Six letters may be a name, such as Garage, but with the hyphen they can only be a code.
HYPHENATED_CODE = re.compile(r"[A-Za-z0-9]{3}-[A-Za-z0-9]{3}")
# Where a step lands: an existing location's id, or the key of one the import will make.
type Spot = tuple[str, str]


@dataclass(frozen=True)
class NewPlace:
    """A location the import makes: its name, where it goes, and its path to show."""

    key: str
    name: str
    parent: Spot | None
    shown_path: str


@dataclass
class Placing:
    """Every row's location, and the locations to make first, parents before children."""

    spots: dict[int, Spot | None] = field(default_factory=dict)
    new_places: list[NewPlace] = field(default_factory=list)
    problems: list[ImportProblem] = field(default_factory=list)


@dataclass
class _Home:
    children: dict[tuple[str | None, str], str]
    names: dict[str, str]
    planned: dict[tuple[Spot | None, str], NewPlace] = field(default_factory=dict)


def _home(session: Session) -> _Home:
    tree = locations.list_locations(session).locations
    return _Home(
        children={(place.parent_id, place.name.lower()): place.id for place in tree},
        names={place.id: " > ".join(step.name for step in place.path) for place in tree},
    )


def _shown(home: _Home, placing: Placing, spot: Spot | None) -> str:
    if spot is None:
        return ""
    kind, value = spot
    return home.names[value] if kind == "id" else placing.new_places[int(value)].shown_path


def _planned(home: _Home, placing: Placing, parent: Spot | None, name: str) -> Spot:
    found = home.planned.get((parent, name.lower()))
    if found is None:
        above = _shown(home, placing, parent)
        shown = f"{above} > {name}" if above else name
        found = NewPlace(
            key=str(len(placing.new_places)), name=name, parent=parent, shown_path=shown
        )
        home.planned[(parent, name.lower())] = found
        placing.new_places.append(found)
    return ("new", found.key)


def _step(home: _Home, placing: Placing, spot: Spot | None, name: str) -> Spot:
    if spot is None or spot[0] == "id":
        existing = home.children.get((spot[1] if spot else None, name.lower()))
        if existing is not None:
            return ("id", existing)
    return _planned(home, placing, spot, name)


def _place(home: _Home, placing: Placing, row: ImportRow) -> None:
    spot: Spot | None = None
    for name in row.path:
        code = locations.location_code(name)
        if code in home.names:
            spot = ("id", code)
            continue
        if HYPHENATED_CODE.fullmatch(name.strip()) is None:
            spot = _step(home, placing, spot, name)
            continue
        message = f"No location has the code {code}."
        placing.problems.append(ImportProblem(row=row.row, column="location", message=message))
        return
    placing.spots[row.row] = spot


def place_rows(session: Session, rows: list[ImportRow]) -> Placing:
    """Find each row's location by name or location code, planning the ones that don't exist yet."""
    home = _home(session)
    placing = Placing()
    for row in rows:
        _place(home, placing, row)
    return placing


def new_location_type(place: NewPlace) -> LocationType:
    """A new top-level place is a site; anything made inside another is a bin."""
    return LocationType.site if place.parent is None else LocationType.bin
