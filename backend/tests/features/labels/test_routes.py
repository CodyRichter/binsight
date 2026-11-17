from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.features.labels.label_image import draw_label

LABELS = "/api/labels"


def _site(client: TestClient, name: str = "Home") -> str:
    response = client.post("/api/locations", json={"name": name, "type": "site"})
    location_id: str = response.json()["id"]
    return location_id


def test_labels_need_sign_in(client: TestClient) -> None:
    response = client.post(f"{LABELS}/blank", json={"count": 1})
    assert (response.status_code, response.json()["error"]["code"]) == (401, "not_signed_in")


def test_blank_labels_are_made_in_a_batch(signed_in: TestClient) -> None:
    response = signed_in.post(f"{LABELS}/blank", json={"count": 2})
    assert response.status_code == 201
    body = response.json()
    assert body["history_entry_id"]
    assert body["labels"] == [
        {
            "code": code,
            "location_id": None,
            "claimed_at": None,
            "created_at": body["labels"][0]["created_at"],
        }
        for code in ("B-001", "B-002")
    ]


@pytest.mark.parametrize("count", [0, 101])
def test_a_batch_is_one_to_a_hundred_labels(signed_in: TestClient, count: int) -> None:
    response = signed_in.post(f"{LABELS}/blank", json={"count": count})
    assert (response.status_code, response.json()["error"]["code"]) == (422, "validation_failed")


def test_claiming_a_label_puts_its_code_on_the_location(signed_in: TestClient) -> None:
    signed_in.post(f"{LABELS}/blank", json={"count": 14})
    home = _site(signed_in)
    claimed = signed_in.post(f"{LABELS}/b14/claim", json={"location_id": home})
    assert claimed.status_code == 200
    assert (claimed.json()["code"], claimed.json()["location_id"]) == ("B-014", home)
    assert claimed.json()["history_entry_id"]
    assert signed_in.get(f"{LABELS}/B-014").json()["location_id"] == home
    assert signed_in.get(f"/api/locations/{home}").json()["label_code"] == "B-014"


def test_a_label_in_use_is_refused_with_a_conflict(signed_in: TestClient) -> None:
    signed_in.post(f"{LABELS}/blank", json={"count": 1})
    signed_in.post(f"{LABELS}/B-001/claim", json={"location_id": _site(signed_in)})
    response = signed_in.post(
        f"{LABELS}/B-001/claim", json={"location_id": _site(signed_in, "Car")}
    )
    assert (response.status_code, response.json()["error"]["code"]) == (
        409,
        "label_already_claimed",
    )


def test_an_unknown_code_is_not_found(signed_in: TestClient) -> None:
    for path in (f"{LABELS}/B-404", f"{LABELS}/B-404/image"):
        response = signed_in.get(path)
        assert (response.status_code, response.json()["error"]["code"]) == (
            404,
            "label_not_found",
        )


def test_labels_are_listed_newest_first(signed_in: TestClient) -> None:
    signed_in.post(f"{LABELS}/blank", json={"count": 3})
    page = signed_in.get(LABELS, params={"limit": 2}).json()
    assert [label["code"] for label in page["items"]] == ["B-003", "B-002"]
    rest = signed_in.get(LABELS, params={"cursor": page["next_cursor"]}).json()
    assert [label["code"] for label in rest["items"]] == ["B-001"]


def test_the_image_downloads_as_a_png_holding_the_label_address(signed_in: TestClient) -> None:
    signed_in.post(f"{LABELS}/blank", json={"count": 1})
    response = signed_in.get(f"{LABELS}/b1/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["content-disposition"] == 'attachment; filename="B-001.png"'
    assert Image.open(BytesIO(response.content)).format == "PNG"
    assert response.content == draw_label("B-001", "http://binsight.test/l/B-001")
