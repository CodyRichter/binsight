from io import BytesIO

from PIL import Image

from app.features.labels.label_image import draw_label


def _band_pixels(image: Image.Image, top: int, bottom: int, left: int, right: int) -> list[int]:
    crop = image.crop((left, top, right, bottom))
    return list(crop.tobytes())


def test_label_image_fits_a_two_by_three_ratio_with_header_and_nameplate() -> None:
    png = draw_label("K7Q-4MZ", "https://binsight.test/l/K7Q-4MZ")
    image = Image.open(BytesIO(png))

    assert image.format == "PNG"
    assert image.mode == "L"
    assert (image.width, image.height) == (600, 900)

    header_pixels = _band_pixels(image, top=32, bottom=104, left=140, right=460)
    assert sum(pixel < 32 for pixel in header_pixels) / len(header_pixels) > 0.65
    assert sum(pixel > 224 for pixel in header_pixels) / len(header_pixels) > 0.12

    footer_pixels = _band_pixels(image, top=736, bottom=868, left=60, right=540)
    assert sum(pixel < 32 for pixel in footer_pixels) / len(footer_pixels) > 0.55
    assert sum(pixel > 224 for pixel in footer_pixels) / len(footer_pixels) > 0.12

    quiet_strip = _band_pixels(image, top=132, bottom=160, left=120, right=480)
    assert all(pixel == 255 for pixel in quiet_strip)


def test_label_image_fits_long_codes_and_addresses_inside_the_frame() -> None:
    png = draw_label("K7Q-4MZ-9999", "https://inventory.example.com/nested/path/l/K7Q-4MZ")
    image = Image.open(BytesIO(png))

    assert (image.width, image.height) == (600, 900)
    left_edge = _band_pixels(image, top=740, bottom=860, left=22, right=42)
    right_edge = _band_pixels(
        image, top=740, bottom=860, left=image.width - 42, right=image.width - 22
    )
    assert all(pixel < 32 for pixel in left_edge)
    assert all(pixel < 32 for pixel in right_edge)


def test_different_labels_produce_different_images() -> None:
    first = draw_label("K7Q-4MZ", "https://binsight.test/l/K7Q-4MZ")
    second = draw_label("B2R-W9T", "https://binsight.test/l/B2R-W9T")
    assert first != second
