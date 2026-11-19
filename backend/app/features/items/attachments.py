from datetime import datetime

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.pagination import Page, counted_page, decode_offset
from app.features.attachments import service as attachments
from app.features.attachments.service import Attachment, StoredFile
from app.features.history import service as history
from app.features.items.records import item_record, live_item
from app.features.items.schemas import AttachmentAdded, AttachmentRemoved, NewWebLink
from app.models import Actor, AttachmentKind


def list_item_attachments(
    session: Session, item_id: str, limit: int, cursor: str | None, visitor: bool
) -> Page[Attachment]:
    """An item's photos, files and web links, photos first; a visitor is shown photos only."""
    item_record(session, item_id)
    rows = attachments.list_item_attachments(session, item_id)
    if visitor:
        rows = [row for row in rows if row.kind == AttachmentKind.photo]
    return counted_page(rows, decode_offset(cursor) if cursor else 0, limit)


def _added(
    session: Session, change: history.RecordChange, action: str, actor: Actor, now: datetime
) -> AttachmentAdded:
    session.flush()
    entry_id = history.record(session, actor, action, [change], now)
    shaped = attachments.get_item_attachment(session, change.after["item_id"], change.record_id)
    return AttachmentAdded(**shaped.model_dump(), history_entry_id=entry_id)


def _stored(
    session: Session, item_id: str, stored: StoredFile, kind: AttachmentKind, now: datetime
) -> history.RecordChange:
    item = live_item(session, item_id)
    fields = attachments.attach_to_item(session, item.id, stored, kind, now)
    return history.RecordChange("attachment", stored.id, None, fields)


def add_item_photo(
    session: Session, item_id: str, stored: StoredFile, actor: Actor, now: datetime
) -> AttachmentAdded:
    """Add a photo to an item; its first photo stays its picture."""
    change = _stored(session, item_id, stored, AttachmentKind.photo, now)
    return _added(session, change, "item.photo_added", actor, now)


def attach_file(
    session: Session, item_id: str, stored: StoredFile, actor: Actor, now: datetime
) -> AttachmentAdded:
    """Attach a file, such as a receipt or a manual, to an item."""
    change = _stored(session, item_id, stored, AttachmentKind.file, now)
    return _added(session, change, "item.file_attached", actor, now)


def attach_web_link(
    session: Session, item_id: str, link: NewWebLink, actor: Actor, now: datetime
) -> AttachmentAdded:
    """Attach a web link, such as a manual's page, to an item."""
    item = live_item(session, item_id)
    link_id, fields = attachments.attach_link(session, item.id, link.url, link.name, now)
    change = history.RecordChange("attachment", link_id, None, fields)
    return _added(session, change, "item.web_link_attached", actor, now)


def preview_remove_item_attachment(
    session: Session, item_id: str, attachment_id: str
) -> Attachment:
    """The attachment that removing would take off the item, refused as removing it would be."""
    item = live_item(session, item_id)
    attachment = attachments.get_item_attachment(session, item_id, attachment_id)
    last_photo = (
        attachment.kind == AttachmentKind.photo
        and attachments.count_item_photos(session, item_id) == 1
    )
    if item.name is None and last_photo:
        raise AppError(
            409, "photo_names_item", "That photo stands in for the item's name. Name it first."
        )
    return attachment


def remove_item_attachment(
    session: Session, item_id: str, attachment_id: str, actor: Actor, now: datetime
) -> AttachmentRemoved:
    """Take a photo, file or web link off an item; Undo puts it back."""
    attachment = preview_remove_item_attachment(session, item_id, attachment_id)
    fields = attachments.detach(session, attachment_id)
    change = history.RecordChange("attachment", attachment_id, fields, {})
    entry_id = history.record(session, actor, "item.attachment_removed", [change], now)
    return AttachmentRemoved(**attachment.model_dump(), history_entry_id=entry_id)
