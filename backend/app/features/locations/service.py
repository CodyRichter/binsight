from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.features.history import service as history
from app.features.locations.schemas import Location, LocationCreated, LocationTree, NewLocation
from app.features.locations.schemas import (
    PathStep as PathStep,
)  # re-exported: items reach locations only through this file
from app.models import Actor


def _not_found() -> AppError:
    return AppError(404, "location_not_found", "That location does not exist.")


def _get(session: Session, location_id: str) -> models.Location:
    location = session.get(models.Location, location_id)
    if location is None:
        raise _not_found()
    return location


def _path(session: Session, location: models.Location) -> list[PathStep]:
    steps = [PathStep(id=location.id, name=location.name)]
    while location.parent_id is not None:
        location = _get(session, location.parent_id)
        steps.append(PathStep(id=location.id, name=location.name))
    return steps[::-1]


def _tree(session: Session) -> list[Location]:
    rows = list(
        session.scalars(
            select(models.Location).order_by(models.Location.created_at, models.Location.id)
        )
    )
    children: defaultdict[str, list[models.Location]] = defaultdict(list)
    for row in rows:
        if row.parent_id is not None:
            children[row.parent_id].append(row)

    def item_count(row: models.Location) -> int:
        return row.direct_item_count + sum(item_count(child) for child in children[row.id])

    return [
        Location(
            id=row.id,
            name=row.name,
            type=row.type,
            parent_id=row.parent_id,
            summary=row.summary,
            path=_path(session, row),
            direct_item_count=row.direct_item_count,
            item_count=item_count(row),
        )
        for row in rows
    ]


def _find(session: Session, location_id: str) -> Location:
    found = next((location for location in _tree(session) if location.id == location_id), None)
    if found is None:
        raise _not_found()
    return found


def list_locations(session: Session) -> LocationTree:
    """Every location in the home, each with its path and how many items it holds."""
    return LocationTree(locations=_tree(session))


def get_location(session: Session, location_id: str) -> Location:
    """One location, with its path and how many items it holds."""
    return _find(session, location_id)


def create_location(
    session: Session, new: NewLocation, actor: Actor, now: datetime
) -> LocationCreated:
    """Add a site, or a location inside another one."""
    if new.parent_id is not None:
        _get(session, new.parent_id)
    location = models.Location(
        id=new_identifier(), created_at=now, updated_at=now, **new.model_dump()
    )
    session.add(location)
    session.flush()
    change = history.RecordChange("location", location.id, None, new.model_dump(mode="json"))
    entry_id = history.record(session, actor, "location.created", [change], now)
    return LocationCreated(**_find(session, location.id).model_dump(), history_entry_id=entry_id)


def location_path(session: Session, location_id: str) -> list[PathStep]:
    """The names from a location's site down to the location itself."""
    return _path(session, _get(session, location_id))


def location_ids_within(session: Session, location_id: str) -> list[str]:
    """A location's identifier and the identifiers of every location beneath it."""
    _get(session, location_id)
    children: defaultdict[str, list[str]] = defaultdict(list)
    for child_id, parent_id in session.execute(
        select(models.Location.id, models.Location.parent_id)
    ):
        if parent_id is not None:
            children[parent_id].append(child_id)
    within, waiting = [], [location_id]
    while waiting:
        current = waiting.pop()
        within.append(current)
        waiting.extend(children[current])
    return within
