from fastapi.testclient import TestClient

from tests.photos import photo


def _photo_item(signed_in: TestClient) -> dict[str, str]:
    files = {"photo": ("shelf.jpg", photo(), "image/jpeg")}
    response = signed_in.post("/api/items/add-by-photo", files=files)
    assert response.status_code == 201
    body: dict[str, str] = response.json()
    return body


def test_a_photo_is_served_as_jpeg_the_browser_may_keep(signed_in: TestClient) -> None:
    item = _photo_item(signed_in)
    response = signed_in.get(item["photo_url"])
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, max-age=31536000, immutable"
    assert response.content.startswith(b"\xff\xd8")


def test_an_unknown_photo_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.get("/api/attachments/nothing/file")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "attachment_not_found"


def test_other_api_answers_are_still_kept_out_of_the_cache(signed_in: TestClient) -> None:
    assert signed_in.get("/api/items/inbox/count").headers["cache-control"] == "no-store"
