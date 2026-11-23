from io import BytesIO

from PIL import Image

from app.features.labels.label_image import draw_label


def _open(code: str, address: str) -> Image.Image:
    return Image.open(BytesIO(draw_label(code, address)))


def _band_pixels(image: Image.Image, top: int, bottom: int, left: int, right: int) -> list[int]:
    return list(image.crop((left, top, right, bottom)).tobytes())


def test_label_image_is_three_by_two_inches_with_the_code_in_a_dark_pill() -> None:
    image = _open("K7Q-4MZ", "https://binsight.test/l/K7Q-4MZ")

    assert image.format == "PNG"
    assert image.mode == "L"
    assert (image.width, image.height) == (900, 600)

    pill = _band_pixels(image, top=310, bottom=390, left=500, right=800)
    assert sum(pixel < 32 for pixel in pill) / len(pill) > 0.55
    assert sum(pixel > 224 for pixel in pill) / len(pill) > 0.12


def test_label_image_keeps_ink_light_for_thermal_printers() -> None:
    image = _open("K7Q-4MZ", "https://binsight.test/l/K7Q-4MZ")
    pixels = list(image.tobytes())

    # Two narrow side bars, the QR code and one small pill: wide solid areas print faded.
    assert sum(pixel < 128 for pixel in pixels) / len(pixels) < 0.4
    above_the_brand = _band_pixels(image, top=0, bottom=190, left=480, right=830)
    assert all(pixel == 255 for pixel in above_the_brand)
    for left in (30, 846):
        assert all(pixel < 32 for pixel in _band_pixels(image, 60, 540, left, left + 24))
    assert all(pixel == 255 for pixel in _band_pixels(image, 0, 600, 0, 30))


def test_label_image_fits_long_codes_inside_the_pill() -> None:
    image = _open("K7Q-4MZ-9999", "https://inventory.example.com/nested/path/l/K7Q-4MZ")

    assert (image.width, image.height) == (900, 600)
    # The code shrinks to fit: nothing reaches past the pill's end toward the frame.
    right_of_the_pill = _band_pixels(image, top=60, bottom=540, left=818, right=846)
    assert all(pixel == 255 for pixel in right_of_the_pill)
    pill_end = _band_pixels(image, top=330, bottom=360, left=795, right=810)
    assert all(pixel < 32 for pixel in pill_end)


def test_different_labels_produce_different_images() -> None:
    first = draw_label("K7Q-4MZ", "https://binsight.test/l/K7Q-4MZ")
    second = draw_label("B2R-W9T", "https://binsight.test/l/B2R-W9T")
    assert first != second
