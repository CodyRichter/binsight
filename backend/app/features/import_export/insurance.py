from datetime import datetime

from sqlalchemy.orm import Session

from app.features.attachments import service as attachments
from app.features.attachments.service import Attachment
from app.features.import_export.schemas import InsuranceList, InsuredItem, Receipt
from app.features.items import service as items
from app.features.items.service import Item
from app.features.locations import service as locations
from app.features.locations.service import PathStep
from app.models import AttachmentKind


def _receipt(attachment: Attachment) -> Receipt | None:
    if attachment.kind == AttachmentKind.link and attachment.url is not None:
        return Receipt(name=attachment.filename or attachment.url, url=attachment.url)
    if attachment.kind == AttachmentKind.file and attachment.file_url is not None:
        return Receipt(name=attachment.filename or "File", url=attachment.file_url)
    return None


def _insured(item: Item, attached: list[Attachment]) -> InsuredItem:
    receipts = [receipt for receipt in map(_receipt, attached) if receipt is not None]
    return InsuredItem(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        status=item.status,
        path=item.path,
        brand=item.brand,
        model=item.model,
        serial_number=item.serial_number,
        purchase_date=item.purchase_date,
        price_cents=item.price_cents,
        order_link=item.order_link,
        photo_urls=[
            each.file_url
            for each in attached
            if each.kind == AttachmentKind.photo and each.file_url is not None
        ],
        receipts=receipts,
    )


def _in_order(found: list[Item]) -> list[Item]:
    return sorted(
        found,
        key=lambda item: ([step.name.lower() for step in item.path], (item.name or "").lower()),
    )


def _heading(session: Session, location_id: str | None) -> tuple[str, list[PathStep]]:
    if location_id is None:
        return "Everything", []
    path = locations.location_path(session, location_id)
    return path[-1].name, path


def get_insurance_list(session: Session, location_id: str | None, now: datetime) -> InsuranceList:
    """Every item still owned, here or in the whole home, with what an insurance claim asks for."""
    title, path = _heading(session, location_id)
    within = None if location_id is None else locations.location_ids_within(session, location_id)
    found = _in_order(items.list_items_in(session, within))
    attached = attachments.attachments_by_item(session, [item.id for item in found])
    priced = [item for item in found if item.price_cents is not None]
    return InsuranceList(
        title=title,
        path=path,
        made_at=now,
        item_count=len(found),
        total_cents=sum((item.price_cents or 0) * item.quantity for item in priced),
        items_without_price=len(found) - len(priced),
        items=[_insured(item, attached[item.id]) for item in found],
    )
