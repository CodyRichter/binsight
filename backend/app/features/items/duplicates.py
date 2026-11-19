from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.features.attachments import service as attachments
from app.features.history import service as history
from app.features.items.links import move_links
from app.features.items.records import live_item
from app.features.items.schemas import ItemCreated, ItemMerge, ItemMerged, MergePreview
from app.features.items.shaping import refuse_deleted_home, shaped
from app.models import Actor

# What describes the kind of thing, so a copy is a similar thing; a serial number is this one's.
COPIED = (
    "name",
    "home_location_id",
    "category_id",
    "notes",
    "brand",
    "model",
    "purchase_date",
    "price_cents",
    "order_link",
    "warranty_ends",
    "return_ends",
)
FILLED = (*COPIED[2:], "serial_number")


def _recorded(value: object) -> object:
    # History is JSON, so dates are kept as ISO text.
    return value.isoformat() if isinstance(value, date) else value


def duplicate_item(session: Session, item_id: str, actor: Actor, now: datetime) -> ItemCreated:
    """Add a copy of an item beside it, to describe a similar thing quickly."""
    item = live_item(session, item_id)
    refuse_deleted_home(session, item.home_location_id)
    fields = {field: getattr(item, field) for field in COPIED}
    copy = models.Item(id=new_identifier(), quantity=1, created_at=now, updated_at=now, **fields)
    copy.tags = item.tags
    session.add(copy)
    session.flush()
    after = {field: _recorded(value) for field, value in fields.items()}
    after |= {"quantity": 1, "tags": copy.tags}
    change = history.RecordChange("item", copy.id, None, after)
    entry_id = history.record(session, actor, "item.created", [change], now)
    return ItemCreated(**shaped(session, copy).model_dump(), history_entry_id=entry_id)


def _merging(session: Session, item_id: str, into_id: str) -> tuple[models.Item, models.Item]:
    if item_id == into_id:
        raise AppError(409, "same_item", "An item can't be merged into itself.")
    return live_item(session, item_id), live_item(session, into_id)


def preview_merge_item(session: Session, item_id: str, merge: ItemMerge) -> MergePreview:
    """The two items a merge would fold together, refused as merging them would be."""
    item, into = _merging(session, item_id, merge.into)
    return MergePreview(item=shaped(session, item), into=shaped(session, into))


def _folded(item: models.Item, into: models.Item, now: datetime) -> history.RecordChange:
    fields: dict[str, Any] = {
        field: getattr(item, field)
        for field in FILLED
        if getattr(into, field) is None and getattr(item, field) is not None
    }
    fields["quantity"] = into.quantity + item.quantity
    tags = sorted({*into.tags, *item.tags})
    before = {field: _recorded(getattr(into, field)) for field in fields}
    for field, value in fields.items():
        setattr(into, field, value)
    after = {field: _recorded(value) for field, value in fields.items()}
    if tags != into.tags:
        before["tags"], after["tags"] = into.tags, tags
        into.tags = tags
    into.updated_at = now
    return history.RecordChange("item", into.id, before, after)


def _gone(item: models.Item, now: datetime) -> history.RecordChange:
    item.deleted_at = now
    item.updated_at = now
    return history.RecordChange(
        "item", item.id, {"deleted_at": None}, {"deleted_at": now.isoformat()}
    )


def merge_item(
    session: Session, item_id: str, merge: ItemMerge, actor: Actor, now: datetime
) -> ItemMerged:
    """Fold an item into another: its count, tags, empty details, files and links, then it goes."""
    item, into = _merging(session, item_id, merge.into)
    changes = [
        _folded(item, into, now),
        *(
            history.RecordChange("attachment", attachment_id, before, after)
            for attachment_id, before, after in attachments.move_item_attachments(
                session, item.id, into.id, now
            )
        ),
        *move_links(session, item.id, into.id),
        _gone(item, now),
    ]
    session.flush()
    entry_id = history.record(session, actor, "item.merged", changes, now)
    return ItemMerged(**shaped(session, into).model_dump(), history_entry_id=entry_id)
