from sqlalchemy.orm import Session

from app.features.labels.label_image import draw_label
from app.features.labels.schemas import LabelImage
from app.features.locations import service as locations


def label_image(session: Session, code: str, app_address: str) -> LabelImage:
    """A location's label as a PNG to print: its QR code and its code, which never changes."""
    location = locations.get_location(session, locations.location_code(code))
    return LabelImage(
        code=location.id, png=draw_label(location.id, f"{app_address}/l/{location.id}")
    )
