from collections.abc import Sequence
from io import BytesIO
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

# 2x3 inches at 300 DPI, with a ~1 mm margin inside the canvas for thermal feed drift.
LABEL_WIDTH = 600
LABEL_HEIGHT = 900
OUTER_MARGIN = 12
BORDER_WIDTH = 10
CORNER_RADIUS = 36
HEADER_HEIGHT = 108
FOOTER_HEIGHT = 172
QR_MAX_PIXELS = 456
SUPERSAMPLE = 2
FONT_WEIGHT = 700
BRAND_NAME = "Binsight"
MONO_FONT_PATH = Path(__file__).with_name("atkinson-hyperlegible-mono.woff2")
SANS_FONT_PATH = Path(__file__).with_name("atkinson-hyperlegible-next.woff2")
BLACK = 0
WHITE = 255


def _is_finder_module(row: int, col: int, size: int) -> bool:
    in_top = row < 7
    in_bottom = row >= size - 7
    in_left = col < 7
    in_right = col >= size - 7
    return (in_top and (in_left or in_right)) or (in_bottom and in_left)


def _is_dark_data(matrix: Sequence[Sequence[int]], row: int, col: int) -> bool:
    size = len(matrix)
    if not (0 <= row < size and 0 <= col < size):
        return False
    if _is_finder_module(row, col, size):
        return False
    return bool(matrix[row][col])


def _draw_finder(draw: ImageDraw.ImageDraw, x: int, y: int, cell: int) -> None:
    draw.rounded_rectangle(
        (x, y, x + 7 * cell - 1, y + 7 * cell - 1),
        radius=int(cell * 1.65),
        fill=BLACK,
    )
    draw.rounded_rectangle(
        (x + cell, y + cell, x + 6 * cell - 1, y + 6 * cell - 1),
        radius=int(cell * 1.05),
        fill=WHITE,
    )
    draw.rounded_rectangle(
        (x + 2 * cell, y + 2 * cell, x + 5 * cell - 1, y + 5 * cell - 1),
        radius=int(cell * 0.85),
        fill=BLACK,
    )


def _draw_module(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    cell: int,
    neighbors: tuple[bool, bool, bool, bool],
) -> None:
    up, down, left, right = neighbors
    x1, y1 = x + cell - 1, y + cell - 1
    half = cell // 2
    draw.rounded_rectangle((x, y, x1, y1), radius=int(cell * 0.42), fill=BLACK)
    if up or left:
        draw.rectangle((x, y, x + half, y + half), fill=BLACK)
    if up or right:
        draw.rectangle((x + half, y, x1, y + half), fill=BLACK)
    if down or left:
        draw.rectangle((x, y + half, x + half, y1), fill=BLACK)
    if down or right:
        draw.rectangle((x + half, y + half, x1, y1), fill=BLACK)


def _draw_qr(matrix: Sequence[Sequence[int]]) -> Image.Image:
    size = len(matrix)
    cell = max(6, QR_MAX_PIXELS // size)
    step = cell * SUPERSAMPLE
    canvas = Image.new("L", (size * step, size * step), color=WHITE)
    draw = ImageDraw.Draw(canvas)
    for origin_x, origin_y in ((0, 0), ((size - 7) * step, 0), (0, (size - 7) * step)):
        _draw_finder(draw, origin_x, origin_y, step)
    dark_cells = [
        (row, col) for row in range(size) for col in range(size) if _is_dark_data(matrix, row, col)
    ]
    for row, col in dark_cells:
        neighbors = (
            _is_dark_data(matrix, row - 1, col),
            _is_dark_data(matrix, row + 1, col),
            _is_dark_data(matrix, row, col - 1),
            _is_dark_data(matrix, row, col + 1),
        )
        _draw_module(draw, col * step, row * step, step, neighbors)
    return canvas.resize((size * cell, size * cell), Image.Resampling.LANCZOS)


def _draw_tote_mark(draw: ImageDraw.ImageDraw, x: float, y: float, size: float) -> None:
    scale = size / 32.0
    draw.rounded_rectangle(
        (int(x + 2 * scale), int(y + 4 * scale), int(x + 30 * scale), int(y + 9.5 * scale)),
        radius=max(2, int(2.2 * scale)),
        fill=WHITE,
    )
    draw.polygon(
        [
            (x + 4.2 * scale, y + 11.4 * scale),
            (x + 27.8 * scale, y + 11.4 * scale),
            (x + 25.8 * scale, y + 27.6 * scale),
            (x + 6.2 * scale, y + 27.6 * scale),
        ],
        fill=WHITE,
    )
    draw.rounded_rectangle(
        (int(x + 10.2 * scale), int(y + 15.4 * scale), int(x + 21.8 * scale), int(y + 23 * scale)),
        radius=max(1, int(1.4 * scale)),
        fill=BLACK,
    )


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    # Bundled variable woff2 matches the frontend's fonts with no network call.
    font = ImageFont.truetype(path, size)
    font.set_variation_by_axes([FONT_WEIGHT])
    return font


def _draw_frame(draw: ImageDraw.ImageDraw) -> None:
    x0, y0 = OUTER_MARGIN, OUTER_MARGIN
    x1, y1 = LABEL_WIDTH - 1 - OUTER_MARGIN, LABEL_HEIGHT - 1 - OUTER_MARGIN
    draw.rounded_rectangle((x0, y0, x1, y1), radius=CORNER_RADIUS, fill=BLACK)
    draw.rectangle(
        (x0 + BORDER_WIDTH, y0 + HEADER_HEIGHT, x1 - BORDER_WIDTH, y1 - FOOTER_HEIGHT),
        fill=WHITE,
    )


def _draw_header(draw: ImageDraw.ImageDraw) -> None:
    font = _load_font(SANS_FONT_PATH, 46)
    left, _, right, _ = draw.textbbox((0, 0), BRAND_NAME, font=font)
    _, cap_top, _, cap_bottom = draw.textbbox((0, 0), "B", font=font)
    text_width = right - left
    icon_size = 50
    gap = 18
    group_x = (LABEL_WIDTH - (icon_size + gap + text_width)) / 2
    center_y = OUTER_MARGIN + HEADER_HEIGHT / 2
    _draw_tote_mark(draw, group_x, center_y - icon_size / 2, icon_size)
    text_x = group_x + icon_size + gap - left
    text_y = center_y - (cap_bottom - cap_top) / 2 - cap_top
    draw.text((text_x, text_y), BRAND_NAME, fill=WHITE, font=font)


def _draw_footer(draw: ImageDraw.ImageDraw, code: str) -> None:
    base_size = 98
    max_width = LABEL_WIDTH - 2 * OUTER_MARGIN - 2 * CORNER_RADIUS
    font = _load_font(MONO_FONT_PATH, base_size)
    left, top, right, bottom = draw.textbbox((0, 0), code, font=font)
    width = right - left
    if width > max_width:
        font = _load_font(MONO_FONT_PATH, max(20, int(base_size * max_width / width)))
        left, top, right, bottom = draw.textbbox((0, 0), code, font=font)
    center_y = LABEL_HEIGHT - OUTER_MARGIN - FOOTER_HEIGHT / 2
    text_x = LABEL_WIDTH / 2 - (right - left) / 2 - left
    text_y = center_y - (bottom - top) / 2 - top
    draw.text((text_x, text_y), code, fill=WHITE, font=font)


def draw_label(code: str, address: str) -> bytes:
    """A 2x3-ratio PNG of the QR code holding the label address, framed between brand and code."""
    qr_code = segno.make(address, error="m")
    qr_image = _draw_qr(qr_code.matrix)

    label = Image.new("L", (LABEL_WIDTH, LABEL_HEIGHT), color=WHITE)
    draw = ImageDraw.Draw(label)
    _draw_frame(draw)
    _draw_header(draw)
    qr_top = OUTER_MARGIN + HEADER_HEIGHT
    qr_area_height = LABEL_HEIGHT - 2 * OUTER_MARGIN - HEADER_HEIGHT - FOOTER_HEIGHT
    label.paste(
        qr_image,
        ((LABEL_WIDTH - qr_image.width) // 2, qr_top + (qr_area_height - qr_image.height) // 2),
    )
    _draw_footer(draw, code)

    image = BytesIO()
    label.save(image, format="PNG")
    return image.getvalue()
