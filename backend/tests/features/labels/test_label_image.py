from io import BytesIO

from PIL import Image

from app.features.labels.label_image import draw_label


def _band_pixels(image: Image.Image, top: int, bottom: int, left: int, right: int) -> list[int]:
    crop = image.crop((left, top, right, bottom))
    return [pixel for pixel in crop.tobytes()]


def test_label_image_frames_qr_above_an_inverted_nameplate() -> None:
    png = draw_label("B-002", "https://binsight.test/l/B-002")
    image = Image.open(BytesIO(png))

    assert image.format == "PNG"
    assert image.mode == "L"
    assert image.height > image.width

    footer_pixels = _band_pixels(
        image,
        top=int(image.height * 0.85),
        bottom=int(image.height * 0.96),
        left=int(image.width * 0.12),
        right=int(image.width * 0.88),
    )
    dark_ratio = sum(pixel < 32 for pixel in footer_pixels) / len(footer_pixels)
    bright_ratio = sum(pixel > 224 for pixel in footer_pixels) / len(footer_pixels)
    assert dark_ratio > 0.55
    assert bright_ratio > 0.08

    quiet_strip = _band_pixels(
        image,
        top=24,
        bottom=50,
        left=int(image.width * 0.2),
        right=int(image.width * 0.8),
    )
    assert all(pixel == 255 for pixel in quiet_strip)


def test_label_image_fits_long_codes_inside_the_nameplate() -> None:
    png = draw_label("B-123456", "https://inventory.example.com/nested/l/B-123456")
    image = Image.open(BytesIO(png))

    assert image.format == "PNG"
    left_edge = _band_pixels(
        image,
        top=int(image.height * 0.85),
        bottom=int(image.height * 0.94),
        left=14,
        right=34,
    )
    right_edge = _band_pixels(
        image,
        top=int(image.height * 0.85),
        bottom=int(image.height * 0.94),
        left=image.width - 34,
        right=image.width - 14,
    )
    assert all(pixel < 32 for pixel in left_edge)
    assert all(pixel < 32 for pixel in right_edge)


def test_different_labels_produce_different_images() -> None:
    first = draw_label("B-001", "https://binsight.test/l/B-001")
    second = draw_label("B-002", "https://binsight.test/l/B-002")
    assert first != second
