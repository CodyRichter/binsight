from collections.abc import Sequence
from io import BytesIO
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

# 3x2 inches at 300 DPI. Ink stays light: thermal printers fade wide solid areas, so the only
# fill is the small pill behind the code. The frame is a thin rule inset from the die-cut.
LABEL_WIDTH = 900
LABEL_HEIGHT = 600
FRAME_INSET = 30
FRAME_WIDTH = 6
FRAME_RADIUS = 48
QR_LEFT = 78
QR_MAX_PIXELS = 420
COLUMN_GAP = 44
COLUMN_RIGHT = LABEL_WIDTH - 78
BRAND_HEIGHT = 56
BRAND_GAP = 30
PILL_PADDING_X = 26
PILL_PADDING_Y = 30
PILL_RADIUS = 36
CODE_FONT_SIZE = 116
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
        fill=BLACK,
    )
    draw.polygon(
        [
            (x + 4.2 * scale, y + 11.4 * scale),
            (x + 27.8 * scale, y + 11.4 * scale),
            (x + 25.8 * scale, y + 27.6 * scale),
            (x + 6.2 * scale, y + 27.6 * scale),
        ],
        fill=BLACK,
    )
    draw.rounded_rectangle(
        (int(x + 10.2 * scale), int(y + 15.4 * scale), int(x + 21.8 * scale), int(y + 23 * scale)),
        radius=max(1, int(1.4 * scale)),
        fill=WHITE,
    )


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    # Bundled variable woff2 matches the frontend's fonts with no network call.
    font = ImageFont.truetype(path, size)
    font.set_variation_by_axes([FONT_WEIGHT])
    return font


def _draw_frame(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(
        (FRAME_INSET, FRAME_INSET, LABEL_WIDTH - 1 - FRAME_INSET, LABEL_HEIGHT - 1 - FRAME_INSET),
        radius=FRAME_RADIUS,
        outline=BLACK,
        width=FRAME_WIDTH,
    )


def _draw_brand(draw: ImageDraw.ImageDraw, left: int, right: int, top: int) -> None:
    font = _load_font(SANS_FONT_PATH, 44)
    text_left, _, text_right, _ = draw.textbbox((0, 0), BRAND_NAME, font=font)
    _, cap_top, _, cap_bottom = draw.textbbox((0, 0), "B", font=font)
    icon_size = 48
    gap = 16
    group_x = (left + right - (icon_size + gap + text_right - text_left)) / 2
    center_y = top + BRAND_HEIGHT / 2
    _draw_tote_mark(draw, group_x, center_y - icon_size / 2, icon_size)
    text_x = group_x + icon_size + gap - text_left
    text_y = center_y - (cap_bottom - cap_top) / 2 - cap_top
    draw.text((text_x, text_y), BRAND_NAME, fill=BLACK, font=font)


def _code_font(draw: ImageDraw.ImageDraw, code: str, max_width: int) -> ImageFont.FreeTypeFont:
    font = _load_font(MONO_FONT_PATH, CODE_FONT_SIZE)
    left, _, right, _ = draw.textbbox((0, 0), code, font=font)
    if right - left <= max_width:
        return font
    return _load_font(MONO_FONT_PATH, max(20, int(CODE_FONT_SIZE * max_width / (right - left))))


def _draw_code_pill(
    draw: ImageDraw.ImageDraw,
    code: str,
    font: ImageFont.FreeTypeFont,
    column: tuple[int, int],
    top: int,
) -> None:
    """The code reversed out of the label's one small fill, sized to the text."""
    left, right = column
    text_left, _, text_right, _ = draw.textbbox((0, 0), code, font=font)
    _, cap_top, _, cap_bottom = draw.textbbox((0, 0), "0", font=font)
    pill_height = cap_bottom - cap_top + 2 * PILL_PADDING_Y
    draw.rounded_rectangle((left, top, right, top + pill_height), radius=PILL_RADIUS, fill=BLACK)
    text_x = (left + right) / 2 - (text_right - text_left) / 2 - text_left
    draw.text((text_x, top + PILL_PADDING_Y - cap_top), code, fill=WHITE, font=font)


def _pill_height(draw: ImageDraw.ImageDraw, font: ImageFont.FreeTypeFont) -> int:
    _, cap_top, _, cap_bottom = draw.textbbox((0, 0), "0", font=font)
    return int(cap_bottom - cap_top + 2 * PILL_PADDING_Y)


def draw_label(code: str, address: str) -> bytes:
    """A 3x2-inch PNG: the QR code holding the label address, beside the brand and the code."""
    qr_image = _draw_qr(segno.make(address, error="m").matrix)

    label = Image.new("L", (LABEL_WIDTH, LABEL_HEIGHT), color=WHITE)
    draw = ImageDraw.Draw(label)
    _draw_frame(draw)
    qr_top = (LABEL_HEIGHT - qr_image.height) // 2
    label.paste(qr_image, (QR_LEFT, qr_top))

    column_left = QR_LEFT + qr_image.width + COLUMN_GAP
    font = _code_font(draw, code, COLUMN_RIGHT - column_left - 2 * PILL_PADDING_X)
    group_height = BRAND_HEIGHT + BRAND_GAP + _pill_height(draw, font)
    group_top = (LABEL_HEIGHT - group_height) // 2
    _draw_brand(draw, column_left, COLUMN_RIGHT, group_top)
    pill_top = group_top + BRAND_HEIGHT + BRAND_GAP
    _draw_code_pill(draw, code, font, (column_left, COLUMN_RIGHT), pill_top)

    image = BytesIO()
    label.save(image, format="PNG")
    return image.getvalue()
