from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.features.attachments import service as attachments
from app.features.locations.schemas import Location, PathStep


def location_record(session: Session, location_id: str) -> models.Location:
    """The location's row, even when it has been deleted."""
    location = session.get(models.Location, location_id)
    if location is None:
        raise AppError(404, "location_not_found", "That location does not exist.")
    return location


def live_record(session: Session, location_id: str) -> models.Location:
    """The location's row, refused once it has been deleted."""
    location = location_record(session, location_id)
    if location.deleted_at is not None:
        raise AppError(
            409, "location_deleted", f"{location.name} has been deleted. Restore it first."
        )
    return location


def _step(location: models.Location) -> PathStep:
    return PathStep(id=location.id, name=location.name, type=location.type)


def path(session: Session, location: models.Location) -> list[PathStep]:
    """The steps from the location's site down to the location itself."""
    steps = [_step(location)]
    while location.parent_id is not None:
        location = location_record(session, location.parent_id)
        steps.append(_step(location))
    return steps[::-1]


def all_locations(session: Session) -> list[Location]:
    """Every location, deleted ones included, siblings in their order."""
    # Counts are computed on load, so rows already in the session are reloaded.
    query = (
        select(models.Location)
        .order_by(models.Location.position, models.Location.created_at, models.Location.id)
        .execution_options(populate_existing=True)
    )
    rows = list(session.scalars(query))
    photos = attachments.location_photo_urls(session)
    children: defaultdict[str, list[models.Location]] = defaultdict(list)
    for row in rows:
        if row.parent_id is not None and row.deleted_at is None:
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
            icon=row.icon,
            path=path(session, row),
            direct_item_count=row.direct_item_count,
            item_count=item_count(row),
            photo_url=photos.get(row.id),
            deleted_at=row.deleted_at,
        )
        for row in rows
    ]


def live_locations(session: Session) -> list[Location]:
    """Every location not deleted, siblings in their order."""
    return [location for location in all_locations(session) if location.deleted_at is None]


def find(session: Session, location_id: str) -> Location:
    """One location shaped with its path and counts, even when it has been deleted."""
    location_record(session, location_id)
    return next(location for location in all_locations(session) if location.id == location_id)
