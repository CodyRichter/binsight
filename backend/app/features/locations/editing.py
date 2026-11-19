from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.features.history import service as history
from app.features.locations.schemas import (
    LocationChanges,
    LocationReorder,
    LocationReordered,
    LocationRestored,
    LocationUpdated,
)
from app.features.locations.tree import find, live_record, location_record
from app.models import Actor


def update_location(
    session: Session, location_id: str, changes: LocationChanges, actor: Actor, now: datetime
) -> LocationUpdated:
    """Rename a location, or change its summary, type or icon."""
    location = live_record(session, location_id)
    if changes.type is not None and location.type == models.LocationType.site:
        raise AppError(409, "site_type", "A site stays a site, because it has no parent.")
    sent = changes.model_dump(exclude_unset=True)
    if "summary" in sent and not sent["summary"]:
        sent["summary"] = None
    before = {key: getattr(location, key) for key in sent}
    for key, value in sent.items():
        setattr(location, key, value)
    location.updated_at = now
    session.flush()
    change = history.RecordChange("location", location.id, before, sent)
    entry_id = history.record(session, actor, "location.updated", [change], now)
    return LocationUpdated(**find(session, location.id).model_dump(), history_entry_id=entry_id)


def _live_children(session: Session, parent_id: str | None) -> list[models.Location]:
    query = (
        select(models.Location)
        .where(models.Location.parent_id == parent_id, models.Location.deleted_at.is_(None))
        .order_by(models.Location.position, models.Location.created_at, models.Location.id)
    )
    return list(session.scalars(query))


def reorder_location(
    session: Session, location_id: str, reorder: LocationReorder, actor: Actor, now: datetime
) -> LocationReordered:
    """Put a location at another place among the locations beside it."""
    location = live_record(session, location_id)
    siblings = [row for row in _live_children(session, location.parent_id) if row is not location]
    siblings.insert(min(reorder.position, len(siblings)), location)
    changes = []
    for position, row in enumerate(siblings):
        if row.position != position:
            changes.append(
                history.RecordChange(
                    "location", row.id, {"position": row.position}, {"position": position}
                )
            )
            row.position = position
            row.updated_at = now
    if not changes:
        raise AppError(409, "already_there", "That location is already there.")
    session.flush()
    entry_id = history.record(session, actor, "location.reordered", changes, now)
    return LocationReordered(**find(session, location.id).model_dump(), history_entry_id=entry_id)


def restore_location(
    session: Session, location_id: str, actor: Actor, now: datetime
) -> LocationRestored:
    """Bring a deleted location back, empty, where it was."""
    location = location_record(session, location_id)
    if location.deleted_at is None:
        raise AppError(409, "not_deleted", f"{location.name} isn't deleted.")
    if location.parent_id is not None:
        parent = location_record(session, location.parent_id)
        if parent.deleted_at is not None:
            raise AppError(409, "parent_deleted", f"Restore {parent.name} first.")
    change = history.RecordChange(
        "location",
        location.id,
        {"deleted_at": location.deleted_at.isoformat()},
        {"deleted_at": None},
    )
    location.deleted_at = None
    location.updated_at = now
    session.flush()
    entry_id = history.record(session, actor, "location.restored", [change], now)
    return LocationRestored(**find(session, location.id).model_dump(), history_entry_id=entry_id)


def refuse_destination(session: Session, destination_id: str, within: list[str]) -> None:
    """Refuse a place to put a location's contents that is deleted, or the location or inside it."""
    live_record(session, destination_id)
    if destination_id in within:
        raise AppError(
            409,
            "move_into_itself",
            "A location's contents can't go into the location itself or anything inside it.",
        )


def move_children(
    session: Session, location_id: str, destination_id: str, now: datetime
) -> list[history.RecordChange]:
    """Move the locations directly inside one into another, leaving the caller to record it."""
    changes = []
    for child in _live_children(session, location_id):
        changes.append(
            history.RecordChange(
                "location", child.id, {"parent_id": location_id}, {"parent_id": destination_id}
            )
        )
        child.parent_id = destination_id
        child.updated_at = now
    return changes


def live_child_count(session: Session, location_id: str) -> int:
    """How many locations not deleted sit directly inside this one."""
    return len(_live_children(session, location_id))


def mark_deleted(session: Session, location_id: str, now: datetime) -> history.RecordChange:
    """Take a location out of view, leaving the caller to record it with the rest of its action."""
    location = live_record(session, location_id)
    location.deleted_at = now
    location.updated_at = now
    return history.RecordChange(
        "location", location.id, {"deleted_at": None}, {"deleted_at": now.isoformat()}
    )
