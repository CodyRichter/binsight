from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.features.labels.label_image import draw_label

LABELS = "/api/labels"


def _site(client: TestClient) -> str:
    response = client.post("/api/locations", json={"name": "Home", "type": "site"})
    location_id: str = response.json()["id"]
    return location_id


def test_labels_need_sign_in(client: TestClient) -> None:
    response = client.get(f"{LABELS}/K7Q-4MZ/image")
    assert (response.status_code, response.json()["error"]["code"]) == (401, "not_signed_in")


def test_an_unknown_code_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.get(f"{LABELS}/ZZZ-999/image")
    assert (response.status_code, response.json()["error"]["code"]) == (404, "location_not_found")


def test_the_image_downloads_as_a_png_holding_the_label_address(signed_in: TestClient) -> None:
    code = _site(signed_in)
    response = signed_in.get(f"{LABELS}/{code.lower().replace('-', '')}/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["content-disposition"] == f'attachment; filename="{code}.png"'
    assert Image.open(BytesIO(response.content)).format == "PNG"
    assert response.content == draw_label(code, f"http://binsight.test/l/{code}")
