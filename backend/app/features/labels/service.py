from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.features.labels.label_image import draw_label
from app.features.labels.printer import send_to_printer
from app.features.labels.schemas import LabelImage, PrintAddress, PrintedLabel
from app.features.locations import service as locations
from app.models import INSTALL_SETTINGS_ID, InstallSettings


def label_image(session: Session, code: str, app_address: str) -> LabelImage:
    """A location's label as a PNG to print: its QR code and its code, which never changes."""
    location = locations.get_location(session, locations.location_code(code))
    return LabelImage(
        code=location.id, png=draw_label(location.id, f"{app_address}/l/{location.id}")
    )


def get_print_address(session: Session) -> PrintAddress:
    settings = session.get(InstallSettings, INSTALL_SETTINGS_ID)
    return PrintAddress(print_address=settings.print_address if settings else None)


def set_print_address(session: Session, body: PrintAddress) -> PrintAddress:
    settings = session.get(InstallSettings, INSTALL_SETTINGS_ID)
    if settings is None:
        settings = InstallSettings(id=INSTALL_SETTINGS_ID)
        session.add(settings)
    settings.print_address = body.print_address
    session.flush()
    return PrintAddress(print_address=settings.print_address)


def print_label(session: Session, code: str, app_address: str) -> PrintedLabel:
    """Send a location's label to the print address; the printer's own refusal is passed on."""
    image = label_image(session, code, app_address)
    print_address = get_print_address(session).print_address
    if print_address is None:
        raise AppError(
            409,
            "print_address_not_set",
            "No printer is set up. An admin can add a print address in settings.",
        )
    send_to_printer(print_address, image.png)
    return PrintedLabel(code=image.code)
