from collections.abc import Sequence
from io import BytesIO
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

MODULE_PIXELS = 22
QUIET_ZONE_MODULES = 3
BORDER_WIDTH = 10
CORNER_RADIUS = 42
OUTER_MARGIN = 4
SUPERSAMPLE = 2
FONT_WEIGHT = 700
FONT_PATH = Path(__file__).with_name("atkinson-hyperlegible-mono.woff2")
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


def _draw_qr(matrix: Sequence[Sequence[int]], cell: int) -> Image.Image:
    size = len(matrix)
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


def _load_code_font(code: str, footer_height: int, max_width: int) -> ImageFont.FreeTypeFont:
    size = int(footer_height * 0.62)
    # Bundled variable woff2 matches the frontend's code chip font with no network call.
    font = ImageFont.truetype(FONT_PATH, size)
    font.set_variation_by_axes([FONT_WEIGHT])
    width = font.getbbox(code)[2] - font.getbbox(code)[0]
    if width <= max_width:
        return font
    fitted = max(16, int(size * max_width / width))
    font = ImageFont.truetype(FONT_PATH, fitted)
    font.set_variation_by_axes([FONT_WEIGHT])
    return font


def _draw_frame(
    draw: ImageDraw.ImageDraw, card_width: int, qr_area_height: int, card_height: int
) -> None:
    x0, y0 = OUTER_MARGIN, OUTER_MARGIN
    x1, y1 = x0 + card_width - 1, y0 + card_height - 1
    draw.rounded_rectangle((x0, y0, x1, y1), radius=CORNER_RADIUS, fill=BLACK)
    draw.rounded_rectangle(
        (x0 + BORDER_WIDTH, y0 + BORDER_WIDTH, x1 - BORDER_WIDTH, y0 + qr_area_height),
        radius=max(8, CORNER_RADIUS - BORDER_WIDTH),
        fill=WHITE,
    )
    draw.rectangle(
        (
            x0 + BORDER_WIDTH,
            y0 + qr_area_height - CORNER_RADIUS,
            x1 - BORDER_WIDTH,
            y0 + qr_area_height,
        ),
        fill=WHITE,
    )


def _draw_footer(
    draw: ImageDraw.ImageDraw,
    code: str,
    card_width: int,
    qr_area_height: int,
    footer_height: int,
) -> None:
    icon_size = int(footer_height * 0.56)
    gap = int(icon_size * 0.34)
    max_text_width = card_width - 2 * CORNER_RADIUS - icon_size - gap
    font = _load_code_font(code, footer_height, max_text_width)
    left, top, right, bottom = draw.textbbox((0, 0), code, font=font)
    text_width = right - left
    text_height = bottom - top
    group_x = OUTER_MARGIN + (card_width - (icon_size + gap + text_width)) / 2
    center_y = OUTER_MARGIN + qr_area_height + footer_height / 2
    _draw_tote_mark(draw, group_x, center_y - icon_size / 2, icon_size)
    text_x = group_x + icon_size + gap - left
    text_y = center_y - text_height / 2 - top
    draw.text((text_x, text_y), code, fill=WHITE, font=font)


def draw_label(code: str, address: str) -> bytes:
    """A PNG of the QR code holding the label address, framed above its code nameplate."""
    qr_code = segno.make(address, error="m")
    qr_image = _draw_qr(qr_code.matrix, MODULE_PIXELS)
    quiet = BORDER_WIDTH + MODULE_PIXELS * QUIET_ZONE_MODULES
    card_width = qr_image.width + quiet * 2
    qr_area_height = qr_image.height + quiet * 2
    footer_height = int(card_width * 0.23)
    card_height = qr_area_height + footer_height

    label = Image.new(
        "L",
        (card_width + OUTER_MARGIN * 2, card_height + OUTER_MARGIN * 2),
        color=WHITE,
    )
    draw = ImageDraw.Draw(label)
    _draw_frame(draw, card_width, qr_area_height, card_height)
    label.paste(qr_image, (OUTER_MARGIN + quiet, OUTER_MARGIN + quiet))
    _draw_footer(draw, code, card_width, qr_area_height, footer_height)

    image = BytesIO()
    label.save(image, format="PNG")
    return image.getvalue()
