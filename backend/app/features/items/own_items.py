from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.history import service as history
from app.features.items.schemas import ItemCreated
from app.features.items.shaping import refuse_deleted_home, shaped
from app.features.locations import service as locations
from app.models import Actor, AttachmentKind

Fields = dict[str, Any]


def _holder(session: Session, location_id: str) -> models.Item | None:
    return session.scalar(
        select(models.Item).where(
            models.Item.own_item_of == location_id, models.Item.deleted_at.is_(None)
        )
    )


def refuse_taken(session: Session, location_id: str, item_id: str | None = None) -> None:
    """Refuse making an item a location's own item when another item already is."""
    refuse_deleted_home(session, location_id)
    holder = _holder(session, location_id)
    if holder is not None and holder.id != item_id:
        raise AppError(
            409, "own_item_taken", f"{holder.name or 'Another item'} is already this location."
        )


def leaving(item: models.Item, home_location_id: str | None) -> tuple[Fields, Fields]:
    """The link an item gives up as it leaves home or goes, before and after, for its change."""
    if item.own_item_of is None or item.own_item_of == home_location_id:
        return {}, {}
    before = {"own_item_of": item.own_item_of}
    item.own_item_of = None
    return before, {"own_item_of": None}


def claimed(session: Session, item: models.Item, location_id: str | None) -> tuple[Fields, Fields]:
    """Make an item a location's own item, moving it there, or with None stop it being one."""
    before: Fields = {"own_item_of": item.own_item_of}
    after: Fields = {"own_item_of": location_id}
    if location_id is not None:
        refuse_taken(session, location_id, item.id)
        before["home_location_id"] = item.home_location_id
        after["home_location_id"] = location_id
        item.home_location_id = location_id
    item.own_item_of = location_id
    return before, after


def follow_contents(
    session: Session, location_id: str, destination_id: str | None, merging: bool
) -> history.RecordChange | None:
    """Take a location's own item where its contents go; merged, it is that one's if it has none."""
    item = _holder(session, location_id)
    if item is None:
        return None
    own = merging and destination_id is not None and _holder(session, destination_id) is None
    before = {"home_location_id": location_id, "own_item_of": location_id}
    after = {"home_location_id": destination_id, "own_item_of": destination_id if own else None}
    item.own_item_of = after["own_item_of"]
    item.home_location_id = destination_id
    return history.RecordChange("item", item.id, before, after)


def make_own_item(
    session: Session, settings: Settings, location_id: str, actor: Actor, now: datetime
) -> ItemCreated:
    """Track a location as an item, named like it and kept in it, with a copy of its photo."""
    refuse_taken(session, location_id)
    name = locations.location_path(session, location_id)[-1].name
    item = models.Item(
        id=new_identifier(),
        name=name,
        quantity=1,
        home_location_id=location_id,
        own_item_of=location_id,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    session.flush()
    fields = {"name": name, "quantity": 1, "home_location_id": location_id}
    changes = [history.RecordChange("item", item.id, None, fields | {"own_item_of": location_id})]
    photo = attachments.location_photo_file(session, settings, location_id)
    if photo is None:
        entry_id = history.record(session, actor, "item.created", changes, now)
        return ItemCreated(**shaped(session, item).model_dump(), history_entry_id=entry_id)
    with attachments.copied_photo(settings, photo) as stored:
        attached = attachments.attach_to_item(session, item.id, stored, AttachmentKind.photo, now)
        changes.append(history.RecordChange("attachment", stored.id, None, attached))
        entry_id = history.record(session, actor, "item.created", changes, now)
        return ItemCreated(**shaped(session, item).model_dump(), history_entry_id=entry_id)
