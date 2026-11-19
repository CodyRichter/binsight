from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.attachments import service
from app.features.items import service as items
from tests import builders
from tests.builders import APP_ACTOR
from tests.photos import ORIENTATION_TAG, PDF, photo


def _stored_image(settings: Settings, path: str) -> Image.Image:
    return Image.open(BytesIO((settings.data_directory / path).read_bytes()))


@pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP"])
def test_a_photo_is_stored_as_jpeg(settings: Settings, image_format: str) -> None:
    with service.saved_photo(settings, photo(image_format), "shelf.png") as stored:
        pass
    assert stored.path == f"attachments/{stored.id}.jpg"
    assert stored.filename == "shelf.png"
    assert _stored_image(settings, stored.path).format == "JPEG"


def test_a_photo_taken_sideways_is_stored_upright_without_its_metadata(settings: Settings) -> None:
    with service.saved_photo(settings, photo(size=(40, 20), turned=True), None) as stored:
        pass
    image = _stored_image(settings, stored.path)
    assert image.size == (20, 40)
    assert ORIENTATION_TAG not in image.getexif()


def test_a_large_photo_is_shrunk_to_fit_2048_pixels(settings: Settings) -> None:
    with service.saved_photo(settings, photo(size=(4096, 1024)), None) as stored:
        pass
    assert _stored_image(settings, stored.path).size == (2048, 512)


@pytest.mark.parametrize("raw", [b"not a photo", photo("GIF")])
def test_something_that_is_not_a_photo_is_refused(settings: Settings, raw: bytes) -> None:
    with pytest.raises(AppError) as refused, service.saved_photo(settings, raw, None):
        pass
    assert (refused.value.status, refused.value.code) == (422, "unsupported_photo")


def test_a_photo_over_20_mb_is_refused(settings: Settings) -> None:
    too_large = b"x" * (service.MAX_PHOTO_BYTES + 1)
    with pytest.raises(AppError) as refused, service.saved_photo(settings, too_large, None):
        pass
    assert refused.value.code == "photo_too_large"


def test_a_photo_is_deleted_again_when_the_action_using_it_fails(settings: Settings) -> None:
    with pytest.raises(RuntimeError), service.saved_photo(settings, photo(), None) as stored:
        raise RuntimeError
    assert not (settings.data_directory / stored.path).exists()


def test_base64_that_does_not_decode_is_refused() -> None:
    with pytest.raises(AppError) as refused:
        service.photo_from_base64("not base64!")
    assert refused.value.code == "unsupported_photo"


def test_an_item_s_photo_url_names_its_first_photo(
    settings: Settings, migrated_engine: Engine
) -> None:
    with (
        service.saved_photo(settings, photo(), None) as stored,
        open_write_session(migrated_engine) as session,
    ):
        item = items.create_item_by_photo(session, stored, None, APP_ACTOR, builders.NOW)
    with open_read_session(migrated_engine) as session:
        assert service.photo_url(session, item.id) == f"/api/attachments/{stored.id}/file"
        assert service.attachment_file(
            session, settings, stored.id, visitor=False
        ).path.read_bytes()


@pytest.mark.parametrize(
    ("raw", "content_type", "extension"),
    [(PDF, "application/pdf", "pdf"), (photo("PNG"), "image/png", "png")],
)
def test_a_file_is_stored_exactly_as_sent_by_what_its_bytes_are(
    settings: Settings, raw: bytes, content_type: str, extension: str
) -> None:
    with service.saved_file(settings, raw, "receipt.jpg") as stored:
        pass
    assert (stored.content_type, stored.size) == (content_type, len(raw))
    assert stored.path == f"attachments/{stored.id}.{extension}"
    assert (settings.data_directory / stored.path).read_bytes() == raw


@pytest.mark.parametrize("raw", [b"plain text", photo("GIF")])
def test_a_file_that_is_not_a_pdf_or_image_is_refused(settings: Settings, raw: bytes) -> None:
    with pytest.raises(AppError) as refused, service.saved_file(settings, raw, "notes.pdf"):
        pass
    assert (refused.value.status, refused.value.code) == (422, "unsupported_file")


def test_a_file_over_50_mb_is_refused(settings: Settings) -> None:
    too_large = PDF + b"x" * service.MAX_FILE_BYTES
    with pytest.raises(AppError) as refused, service.saved_file(settings, too_large, None):
        pass
    assert refused.value.code == "file_too_large"
