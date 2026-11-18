from datetime import datetime

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import clock
from app.features.attachments.service import Attachment
from app.features.items import service as items
from app.features.items.schemas import AttachmentRemoved
from app.features.locations import service as locations
from app.features.locations.schemas import Location, LocationPhotoChanged
from app.mcp import confirmation
from app.models import Actor


class AttachmentPreview(BaseModel):
    attachment: Attachment
    confirmation_token: str
    expires_at: datetime


class RemoveItemAttachmentAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or what the second removed."""

    preview: AttachmentPreview | None
    removed: AttachmentRemoved | None


class LocationPhotoPreview(BaseModel):
    location: Location
    confirmation_token: str
    expires_at: datetime


class RemoveLocationPhotoAnswer(BaseModel):
    """Exactly one is set: the preview from the first call, or the location after removing."""

    preview: LocationPhotoPreview | None
    removed: LocationPhotoChanged | None


def remove_item_attachment_in_two_calls(
    session: Session, item_id: str, attachment_id: str, token: str | None
) -> RemoveItemAttachmentAnswer:
    """Preview removing an item's attachment, or remove it with the preview's token."""
    now = clock.now()
    inputs = {"item_id": item_id, "attachment_id": attachment_id}
    if token is None:
        attachment = items.preview_remove_item_attachment(session, item_id, attachment_id)
        issued = confirmation.issue(session, "remove_item_attachment", inputs, now)
        preview = AttachmentPreview(
            attachment=attachment,
            confirmation_token=issued.token,
            expires_at=issued.expires_at,
        )
        return RemoveItemAttachmentAnswer(preview=preview, removed=None)
    confirmation.redeem(session, "remove_item_attachment", inputs, token, now)
    removed = items.remove_item_attachment(session, item_id, attachment_id, Actor.mcp, now)
    return RemoveItemAttachmentAnswer(preview=None, removed=removed)


def remove_location_photo_in_two_calls(
    session: Session, location_id: str, token: str | None
) -> RemoveLocationPhotoAnswer:
    """Preview removing a location's photo, or remove it with the preview's token."""
    now = clock.now()
    inputs = {"location_id": location_id}
    if token is None:
        location = locations.preview_remove_location_photo(session, location_id)
        issued = confirmation.issue(session, "remove_location_photo", inputs, now)
        preview = LocationPhotoPreview(
            location=location, confirmation_token=issued.token, expires_at=issued.expires_at
        )
        return RemoveLocationPhotoAnswer(preview=preview, removed=None)
    confirmation.redeem(session, "remove_location_photo", inputs, token, now)
    removed = locations.remove_location_photo(session, location_id, Actor.mcp, now)
    return RemoveLocationPhotoAnswer(preview=None, removed=removed)
