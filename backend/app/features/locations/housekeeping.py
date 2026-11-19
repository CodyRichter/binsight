from datetime import datetime

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.features.history import service as history
from app.features.items import service as items
from app.features.locations import service as locations
from app.features.locations.schemas import (
    LocationDelete,
    LocationDeleted,
    LocationMerge,
    LocationMerged,
    RemovalPreview,
)
from app.models import Actor

# Deleting and merging move other features' records, and those features build on this one, so
# this file is called directly rather than through service.py (decision 0018).


def _refused_destination(session: Session, location_id: str, destination_id: str) -> None:
    locations.get_live_location(session, location_id)
    within = locations.location_ids_within(session, location_id)
    locations.refuse_destination(session, destination_id, within)


def _move_contents(
    session: Session, location_id: str, destination_id: str, now: datetime
) -> list[history.RecordChange]:
    return [
        *items.rehome_items(session, location_id, destination_id, now),
        *locations.move_children(session, location_id, destination_id, now),
    ]


def _refuse_contents(session: Session, location_id: str) -> None:
    location = locations.get_live_location(session, location_id)
    if location.direct_item_count or locations.live_child_count(session, location_id):
        raise AppError(
            409,
            "location_has_contents",
            "Move or reassign this location's contents before deleting it.",
        )


def preview_removal(
    session: Session, location_id: str, destination_id: str | None
) -> RemovalPreview:
    """What deleting or merging a location would move, refused as the action itself would be."""
    if destination_id is None:
        _refuse_contents(session, location_id)
    else:
        _refused_destination(session, location_id, destination_id)
    location = locations.get_location(session, location_id)
    return RemovalPreview(
        location=location,
        destination=locations.get_location(session, destination_id) if destination_id else None,
        items_moving=location.direct_item_count,
        locations_moving=locations.live_child_count(session, location_id),
    )


def delete_location(
    session: Session, location_id: str, delete: LocationDelete, actor: Actor, now: datetime
) -> LocationDeleted:
    """Delete a location, first moving what is in it to the place chosen; Undo brings it back."""
    destination_id = delete.move_contents_to
    if destination_id is None:
        _refuse_contents(session, location_id)
        changes = []
    else:
        _refused_destination(session, location_id, destination_id)
        changes = _move_contents(session, location_id, destination_id, now)
    changes.append(locations.mark_deleted(session, location_id, now))
    session.flush()
    entry_id = history.record(session, actor, "location.deleted", changes, now)
    deleted = locations.get_location(session, location_id)
    return LocationDeleted(**deleted.model_dump(), history_entry_id=entry_id)


def merge_location(
    session: Session, location_id: str, merge: LocationMerge, actor: Actor, now: datetime
) -> LocationMerged:
    """Merge a location into another: its items and locations move, then it goes."""
    _refused_destination(session, location_id, merge.into)
    changes = [
        *_move_contents(session, location_id, merge.into, now),
        locations.mark_deleted(session, location_id, now),
    ]
    session.flush()
    entry_id = history.record(session, actor, "location.merged", changes, now)
    merged_into = locations.get_location(session, merge.into)
    return LocationMerged(**merged_into.model_dump(), history_entry_id=entry_id)
