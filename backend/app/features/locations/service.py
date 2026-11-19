from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.table_rows import ExportTables, table_rows
from app.features.attachments import service as attachments
from app.features.attachments.service import StoredFile
from app.features.history import service as history
from app.features.locations.editing import live_child_count as live_child_count
from app.features.locations.editing import mark_deleted as mark_deleted
from app.features.locations.editing import move_children as move_children
from app.features.locations.editing import refuse_destination as refuse_destination
from app.features.locations.editing import reorder_location as reorder_location
from app.features.locations.editing import restore_location as restore_location
from app.features.locations.editing import update_location as update_location
from app.features.locations.schemas import (
    Location as Location,
)  # re-exported: search shapes with it
from app.features.locations.schemas import (
    LocationCreated,
    LocationMove,
    LocationMoved,
    LocationPhotoChanged,
    LocationTree,
    SearchableLocation,
)
from app.features.locations.schemas import (
    NewLocation as NewLocation,
)  # re-exported: an import makes the locations its file names
from app.features.locations.schemas import (
    PathStep as PathStep,
)  # re-exported: items reach locations only through this file
from app.features.locations.tree import (
    all_locations,
    find,
    live_locations,
    live_record,
    location_record,
    path,
)
from app.models import Actor


def list_locations(session: Session) -> LocationTree:
    """Every location in the home, each with its path and how many items it holds."""
    return LocationTree(locations=live_locations(session))


def get_location(session: Session, location_id: str) -> Location:
    """One location, with its path and how many items it holds, saying when it was deleted."""
    return find(session, location_id)


def get_live_location(session: Session, location_id: str) -> Location:
    """One location, refused once it has been deleted, for an action that changes it."""
    live_record(session, location_id)
    return find(session, location_id)


def _next_position(session: Session, parent_id: str | None) -> int:
    # Comparing with None reads as IS NULL, so sites are counted among themselves.
    last = session.scalar(
        select(func.max(models.Location.position)).where(models.Location.parent_id == parent_id)
    )
    return 0 if last is None else last + 1


def make_location(session: Session, new: NewLocation, now: datetime) -> history.RecordChange:
    """Add a location, leaving the caller to record it with the rest of its action."""
    if new.parent_id is not None:
        live_record(session, new.parent_id)
    location = models.Location(
        id=new_identifier(),
        position=_next_position(session, new.parent_id),
        created_at=now,
        updated_at=now,
        **new.model_dump(),
    )
    session.add(location)
    session.flush()
    return history.RecordChange("location", location.id, None, new.model_dump(mode="json"))


def create_location(
    session: Session, new: NewLocation, actor: Actor, now: datetime
) -> LocationCreated:
    """Add a site, or a location inside another one."""
    change = make_location(session, new, now)
    entry_id = history.record(session, actor, "location.created", [change], now)
    return LocationCreated(
        **find(session, change.record_id).model_dump(), history_entry_id=entry_id
    )


def _refuse_move(location: models.Location, parent_id: str, within: list[str]) -> None:
    if location.parent_id is None:
        raise AppError(
            409, "site_cannot_move", "A site is a top-level place, so it can't be moved."
        )
    if parent_id in within:
        raise AppError(
            409, "move_into_itself", "A location can't be moved into itself or anything inside it."
        )
    if location.parent_id == parent_id:
        raise AppError(409, "already_there", "That location is already there.")


def move_location(
    session: Session, location_id: str, move: LocationMove, actor: Actor, now: datetime
) -> LocationMoved:
    """Move a location, and everything inside it, into another location."""
    location = live_record(session, location_id)
    live_record(session, move.parent_id)
    _refuse_move(location, move.parent_id, location_ids_within(session, location_id))
    before = {"parent_id": location.parent_id}
    location.parent_id = move.parent_id
    location.updated_at = now
    session.flush()
    change = history.RecordChange("location", location.id, before, {"parent_id": move.parent_id})
    entry_id = history.record(session, actor, "location.moved", [change], now)
    return LocationMoved(**find(session, location.id).model_dump(), history_entry_id=entry_id)


def _photo_changed(
    session: Session,
    location_id: str,
    changes: list[history.RecordChange],
    actor: Actor,
    now: datetime,
) -> LocationPhotoChanged:
    session.flush()
    entry_id = history.record(session, actor, "location.photo_changed", changes, now)
    return LocationPhotoChanged(
        **find(session, location_id).model_dump(), history_entry_id=entry_id
    )


def set_location_photo(
    session: Session, location_id: str, stored: StoredFile, actor: Actor, now: datetime
) -> LocationPhotoChanged:
    """Give a location its photo, in place of any it had; one Undo puts the old one back."""
    live_record(session, location_id)
    old = attachments.location_photo_id(session, location_id)
    added = attachments.attach_to_location(session, location_id, stored, now)
    # The new photo goes first, so undoing takes it away before the old one comes back.
    changes = [history.RecordChange("attachment", stored.id, None, added)]
    if old is not None:
        changes.append(
            history.RecordChange("attachment", old, attachments.detach(session, old), {})
        )
    return _photo_changed(session, location_id, changes, actor, now)


def _photo_id(session: Session, location_id: str) -> str:
    live_record(session, location_id)
    photo_id = attachments.location_photo_id(session, location_id)
    if photo_id is None:
        raise AppError(404, "attachment_not_found", "That location has no photo.")
    return photo_id


def preview_remove_location_photo(session: Session, location_id: str) -> Location:
    """The location whose photo removing would take away, refused when it has none."""
    _photo_id(session, location_id)
    return find(session, location_id)


def remove_location_photo(
    session: Session, location_id: str, actor: Actor, now: datetime
) -> LocationPhotoChanged:
    """Take a location's photo away; Undo puts it back."""
    photo_id = _photo_id(session, location_id)
    removed = attachments.detach(session, photo_id)
    changes = [history.RecordChange("attachment", photo_id, removed, {})]
    return _photo_changed(session, location_id, changes, actor, now)


def location_path(session: Session, location_id: str) -> list[PathStep]:
    """The names from a location's site down to the location itself, even a deleted one."""
    return path(session, location_record(session, location_id))


def live_location_path(session: Session, location_id: str) -> list[PathStep]:
    """The names down to a location something is being put in, refused once it is deleted."""
    return path(session, live_record(session, location_id))


def last_checked_at(session: Session, location_id: str) -> datetime | None:
    """When a location's contents were last checked, or None if never."""
    location = location_record(session, location_id)
    session.refresh(location)
    return location.last_checked_at


def location_ids_within(session: Session, location_id: str) -> list[str]:
    """A location's identifier and the identifiers of every location beneath it, not deleted."""
    location_record(session, location_id)
    children: defaultdict[str, list[str]] = defaultdict(list)
    for child_id, parent_id in session.execute(
        select(models.Location.id, models.Location.parent_id).where(
            models.Location.deleted_at.is_(None)
        )
    ):
        if parent_id is not None:
            children[parent_id].append(child_id)
    within, waiting = [], [location_id]
    while waiting:
        current = waiting.pop()
        within.append(current)
        waiting.extend(children[current])
    return within


def searchable_locations(session: Session) -> list[SearchableLocation]:
    """Every location's name, summary and label code, for search to score."""
    return [
        SearchableLocation(row.id, row.name, row.summary, row.label_code)
        for row in session.scalars(
            select(models.Location).where(models.Location.deleted_at.is_(None))
        )
    ]


def get_locations(session: Session, location_ids: list[str]) -> list[Location]:
    """The locations with these identifiers, in the order given, with their paths and counts."""
    found = {location.id: location for location in all_locations(session)}
    return [found[location_id] for location_id in location_ids]


def locations_not_checked_since(session: Session, cutoff: datetime) -> list[Location]:
    """Locations with items, checked never or not since the cutoff, the longest unchecked first."""
    stale = [
        location
        for location in live_locations(session)
        if location.direct_item_count > 0
        and (location.last_checked_at is None or location.last_checked_at < cutoff)
    ]
    # Never checked is older than any check.
    return sorted(
        stale,
        key=lambda location: (
            location.last_checked_at is not None,
            location.last_checked_at or cutoff,
        ),
    )


def export_tables(session: Session) -> ExportTables:
    """Every location as stored, for the export."""
    return {"locations": table_rows(session, models.Location)}
