import base64
import binascii
from collections.abc import Iterator
from contextlib import contextmanager
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.settings import Settings
from app.features.attachments.schemas import FileOnDisk, StoredFile

MAX_PHOTO_BYTES = 20 * 1024 * 1024
MAX_FILE_BYTES = 50 * 1024 * 1024
LONGEST_EDGE = 2048
IMAGE_TYPES = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}
PDF = ("application/pdf", "pdf")


def _unsupported_photo() -> AppError:
    return AppError(
        422, "unsupported_photo", "That photo could not be read; send a JPEG, PNG or WebP."
    )


def _unsupported_file() -> AppError:
    return AppError(
        422, "unsupported_file", "That file can't be attached; send a PDF, JPEG, PNG or WebP."
    )


def _decoded(text: str, refusal: AppError) -> bytes:
    try:
        return base64.b64decode(text, validate=True)
    except binascii.Error as error:
        raise refusal from error


def photo_from_base64(text: str) -> bytes:
    """The bytes of a photo sent as base64 text."""
    return _decoded(text, _unsupported_photo())


def file_from_base64(text: str) -> bytes:
    """The bytes of a file sent as base64 text."""
    return _decoded(text, _unsupported_file())


def _opened_image(raw: bytes, refusal: AppError) -> Image.Image:
    try:
        image = Image.open(BytesIO(raw))
        if image.format not in IMAGE_TYPES:
            raise refusal
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise refusal from error
    return image


def _upright_jpeg(raw: bytes) -> bytes:
    upright = ImageOps.exif_transpose(_opened_image(raw, _unsupported_photo())).convert("RGB")
    upright.thumbnail((LONGEST_EDGE, LONGEST_EDGE))
    output = BytesIO()
    # Saved without the original's metadata, so a photo never carries where it was taken.
    upright.save(output, format="JPEG", quality=85)
    return output.getvalue()


def _file_type(raw: bytes) -> tuple[str, str]:
    if raw.startswith(b"%PDF-"):
        return PDF
    image = _opened_image(raw, _unsupported_file())
    return IMAGE_TYPES[str(image.format)]


@contextmanager
def _written(
    settings: Settings, content: bytes, kind: tuple[str, str], filename: str | None
) -> Iterator[StoredFile]:
    content_type, extension = kind
    settings.attachments_directory.mkdir(parents=True, exist_ok=True)
    identifier = new_identifier()
    path = f"{settings.attachments_directory.name}/{identifier}.{extension}"
    stored = StoredFile(identifier, path, filename, content_type, len(content))
    file = settings.data_directory / path
    file.write_bytes(content)
    try:
        yield stored
    except BaseException:
        file.unlink(missing_ok=True)
        raise


@contextmanager
def saved_photo(settings: Settings, raw: bytes, filename: str | None) -> Iterator[StoredFile]:
    """Store a photo upright as JPEG; if the action using it then fails, delete it again."""
    if len(raw) > MAX_PHOTO_BYTES:
        raise AppError(422, "photo_too_large", "That photo is larger than 20 MB.")
    with _written(settings, _upright_jpeg(raw), IMAGE_TYPES["JPEG"], filename) as stored:
        yield stored


@contextmanager
def saved_file(settings: Settings, raw: bytes, filename: str | None) -> Iterator[StoredFile]:
    """Store a PDF or image exactly as sent; if the action using it then fails, delete it again."""
    if len(raw) > MAX_FILE_BYTES:
        raise AppError(422, "file_too_large", "That file is larger than 50 MB.")
    with _written(settings, raw, _file_type(raw), filename) as stored:
        yield stored


@contextmanager
def copied_photo(settings: Settings, photo: FileOnDisk) -> Iterator[StoredFile]:
    """Store a copy of a stored photo, so each owner's can be removed alone."""
    with _written(settings, photo.path.read_bytes(), IMAGE_TYPES["JPEG"], photo.filename) as stored:
        yield stored
