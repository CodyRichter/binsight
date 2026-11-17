from io import BytesIO

import segno
from PIL import Image, ImageDraw, ImageFont

MODULE_PIXELS = 12
QUIET_ZONE_MODULES = 4


def draw_label(code: str, address: str) -> bytes:
    """A PNG of the QR code holding the label address, with the code printed beneath it."""
    qr_png = BytesIO()
    segno.make(address, error="m").save(
        qr_png, kind="png", scale=MODULE_PIXELS, border=QUIET_ZONE_MODULES
    )
    qr = Image.open(qr_png).convert("L")
    band = qr.width // 4
    label = Image.new("L", (qr.width, qr.height + band), color=255)
    label.paste(qr)
    # Pillow's own font, so drawing a label needs no font file and no internet.
    font = ImageFont.load_default(size=band * 3 // 5)
    text_top = qr.height - QUIET_ZONE_MODULES * MODULE_PIXELS // 2
    ImageDraw.Draw(label).text(
        (qr.width // 2, text_top + band // 2), code, fill=0, font=font, anchor="mm"
    )
    image = BytesIO()
    label.save(image, format="PNG")
    return image.getvalue()
