import re
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, decode_cursor, encode_cursor
from app.core.table_rows import ExportTables, table_rows
from app.features.history import service as history
from app.features.labels.label_image import draw_label
from app.features.labels.schemas import (
    BlankLabelsCreated,
    Label,
    LabelClaim,
    LabelClaimed,
    LabelImage,
    LabelUnclaimed,
    NewBlankLabels,
)
from app.features.locations import service as locations
from app.models import Actor

# Case and the hyphen are ignored, so b14, B014 and B-014 are the same code.
CODE_PATTERN = re.compile(r"b-?(\d+)", re.IGNORECASE)


def _number(text: str) -> int | None:
    match = CODE_PATTERN.fullmatch(text.strip())
    return int(match.group(1)) if match else None


def _code(number: int) -> str:
    return f"B-{number:03d}"


def _address(app_address: str, code: str) -> str:
    return f"{app_address}/l/{code}"


def _label(label: models.Label) -> Label:
    return Label(
        code=label.code,
        location_id=label.location_id,
        claimed_at=label.claimed_at,
        created_at=label.created_at,
    )


def _find(session: Session, code: str) -> models.Label | None:
    number = _number(code)
    if number is None:
        return None
    return session.scalars(select(models.Label).where(models.Label.number == number)).first()


def _get(session: Session, code: str) -> models.Label:
    label = _find(session, code)
    if label is None:
        raise AppError(404, "label_not_found", f"There is no label {code}.")
    return label


def create_blank_labels(
    session: Session, new: NewBlankLabels, actor: Actor, now: datetime
) -> BlankLabelsCreated:
    """Make a batch of blank labels to print, continuing the series of codes."""
    last = session.scalar(select(func.max(models.Label.number))) or 0
    labels = [
        models.Label(
            id=new_identifier(),
            number=number,
            code=_code(number),
            created_at=now,
            updated_at=now,
        )
        for number in range(last + 1, last + 1 + new.count)
    ]
    session.add_all(labels)
    session.flush()
    changes = [
        history.RecordChange("label", label.id, None, {"code": label.code}) for label in labels
    ]
    entry_id = history.record(session, actor, "label.created", changes, now)
    return BlankLabelsCreated(labels=[_label(label) for label in labels], history_entry_id=entry_id)


def list_labels(session: Session, limit: int, cursor: str | None) -> Page[Label]:
    """Every label, blank or claimed, newest code first."""
    newest_first = select(models.Label).order_by(models.Label.number.desc()).limit(limit + 1)
    if cursor is not None:
        _, last_code = decode_cursor(cursor)
        newest_first = newest_first.where(models.Label.number < (_number(last_code) or 0))
    labels = list(session.scalars(newest_first))
    last = labels[limit - 1] if len(labels) > limit else None
    return Page(
        items=[_label(label) for label in labels[:limit]],
        next_cursor=encode_cursor(last.created_at, last.code) if last else None,
    )


def get_label(session: Session, code: str) -> Label:
    """One label by its code, saying which location it is on, if any."""
    return _label(_get(session, code))


def claim_label(
    session: Session, code: str, claim: LabelClaim, actor: Actor, now: datetime
) -> LabelClaimed:
    """Attach a blank label to a location, the first time it is scanned."""
    label = _get(session, code)
    location = locations.get_location(session, claim.location_id)
    if label.location_id is not None:
        raise AppError(409, "label_already_claimed", f"Label {label.code} is already in use.")
    if location.label_code is not None:
        raise AppError(
            409,
            "location_has_label",
            f"{location.name} already has the label {location.label_code}.",
        )
    label.location_id = location.id
    label.claimed_at = now
    label.updated_at = now
    change = history.RecordChange(
        "label", label.id, {"location_id": None}, {"location_id": location.id}
    )
    entry_id = history.record(session, actor, "label.claimed", [change], now)
    return LabelClaimed(**_label(label).model_dump(), history_entry_id=entry_id)


def unclaim_label(session: Session, code: str, actor: Actor, now: datetime) -> LabelUnclaimed:
    """Turn a claimed label back into a blank one, to undo a claim made by mistake."""
    label = _get(session, code)
    if label.location_id is None:
        raise AppError(409, "label_not_claimed", f"Label {label.code} is already blank.")
    change = history.RecordChange(
        "label", label.id, {"location_id": label.location_id}, {"location_id": None}
    )
    label.location_id = None
    label.claimed_at = None
    label.updated_at = now
    entry_id = history.record(session, actor, "label.unclaimed", [change], now)
    return LabelUnclaimed(**_label(label).model_dump(), history_entry_id=entry_id)


def label_image(session: Session, code: str, app_address: str) -> LabelImage:
    """The label as a PNG to print: its QR code and its code. The code never changes."""
    label = _get(session, code)
    return LabelImage(
        code=label.code, png=draw_label(label.code, _address(app_address, label.code))
    )


def location_id_for(session: Session, location: str) -> str:
    """The location a claimed label's code names, or the value itself when it is not one."""
    label = _find(session, location)
    if label is None or label.location_id is None:
        return location
    return label.location_id


def label_number(text: str) -> int | None:
    """The number in a typed label code, ignoring case and the hyphen: b14 and B-014 are 14."""
    return _number(text)


def export_tables(session: Session) -> ExportTables:
    """Every label, blank or claimed, as stored, for the export."""
    return {"labels": table_rows(session, models.Label)}
