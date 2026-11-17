"""Photos for tests, made in memory with Pillow."""

from io import BytesIO

from PIL import Image

# EXIF orientation 6: the camera was turned, so the picture is shown rotated a quarter turn.
TURNED_A_QUARTER = 6
ORIENTATION_TAG = 0x0112


def photo(
    image_format: str = "JPEG", size: tuple[int, int] = (40, 20), turned: bool = False
) -> bytes:
    """A small solid-colored photo in the given format, optionally marked as taken sideways."""
    image = Image.new("RGB", size, "orange")
    output = BytesIO()
    if turned:
        exif = Image.Exif()
        exif[ORIENTATION_TAG] = TURNED_A_QUARTER
        image.save(output, format=image_format, exif=exif)
    else:
        image.save(output, format=image_format)
    return output.getvalue()
