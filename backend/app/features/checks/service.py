from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.core.identifiers import new_identifier
from app.features.checks.schemas import CheckLocation, CheckPreview, LocationChecked
from app.features.history import service as history
from app.features.items import service as items
from app.features.locations import service as locations
from app.models import Actor


def preview_check_location(
    session: Session, location_id: str, check: CheckLocation
) -> CheckPreview:
    """What checking a location would do: the items it would mark missing."""
    location = locations.get_location(session, location_id)
    missing = items.items_to_mark_missing(session, location_id, check.missing_item_ids)
    return CheckPreview(location=location, marked_missing=missing)


def check_location(
    session: Session, location_id: str, check: CheckLocation, actor: Actor, now: datetime
) -> LocationChecked:
    """Record that a location's contents are right, marking any items not found there missing."""
    locations.get_location(session, location_id)
    record = models.Check(
        id=new_identifier(),
        location_id=location_id,
        checked_at=now,
        actor=actor,
        created_at=now,
        updated_at=now,
    )
    session.add(record)
    session.flush()
    created = {"location_id": location_id, "checked_at": now.isoformat()}
    changes = [
        history.RecordChange("check", record.id, None, created),
        *items.mark_items_missing(session, location_id, check.missing_item_ids, now),
    ]
    entry_id = history.record(session, actor, "location.checked", changes, now)
    session.flush()
    marked = [items.get_item(session, item_id) for item_id in check.missing_item_ids]
    location = locations.get_location(session, location_id)
    return LocationChecked(
        **location.model_dump(), marked_missing=marked, history_entry_id=entry_id
    )
