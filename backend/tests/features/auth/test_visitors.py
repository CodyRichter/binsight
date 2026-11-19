from collections.abc import Callable

from fastapi.testclient import TestClient

from app.models import Role
from tests.photos import PDF, photo

PRIVATE = {"serial_number": "SN-1", "price_cents": 1999, "order_link": "https://shop.test/drill"}


def _drill(signed_in: TestClient) -> tuple[str, str]:
    """A drill in a bin, with every private detail filled in, a photo and a receipt."""
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    item = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": site}).json()
    signed_in.patch(f"/api/items/{item['id']}", json=PRIVATE)
    signed_in.post(
        f"/api/items/{item['id']}/photos", files={"photo": ("a.jpg", photo(), "image/jpeg")}
    )
    receipt = ("Receipt.pdf", PDF, "application/pdf")
    signed_in.post(f"/api/items/{item['id']}/files", files={"file": receipt})
    return site, item["id"]


def test_a_visitor_sees_an_item_without_its_private_details(
    signed_in: TestClient, visitor: TestClient
) -> None:
    site, drill = _drill(signed_in)
    shown = visitor.get(f"/api/items/{drill}").json()
    assert shown["name"] == "Drill"
    assert {field: shown[field] for field in PRIVATE} == dict.fromkeys(PRIVATE)
    listed = visitor.get("/api/items", params={"location_id": site}).json()["items"]
    assert [each["price_cents"] for each in listed] == [None]
    found = visitor.get("/api/search", params={"query": "drill"}).json()["results"]
    assert [each["item"]["serial_number"] for each in found if each["kind"] == "item"] == [None]


def test_a_viewer_sees_the_private_details(
    signed_in: TestClient, sign_in_as: Callable[[Role], TestClient]
) -> None:
    _site, drill = _drill(signed_in)
    shown = sign_in_as(Role.viewer).get(f"/api/items/{drill}").json()
    assert {field: shown[field] for field in PRIVATE} == PRIVATE


def test_a_visitor_sees_an_item_s_photos_but_not_its_files(
    signed_in: TestClient, visitor: TestClient
) -> None:
    _site, drill = _drill(signed_in)
    every = signed_in.get(f"/api/items/{drill}/attachments").json()["items"]
    shown = visitor.get(f"/api/items/{drill}/attachments").json()["items"]
    assert [each["kind"] for each in shown] == ["photo"]
    receipt = next(each for each in every if each["kind"] == "file")
    assert visitor.get(shown[0]["file_url"]).status_code == 200
    refused = visitor.get(receipt["file_url"])
    assert (refused.status_code, refused.json()["error"]["code"]) == (401, "not_signed_in")


def test_a_change_s_history_keeps_who_made_it(
    signed_in: TestClient, sign_in_as: Callable[[Role], TestClient]
) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    editor = sign_in_as(Role.editor)
    drill = editor.post("/api/items", json={"name": "Drill", "home_location_id": site}).json()
    signed_in.patch(f"/api/items/{drill['id']}", json={"quantity": 2})
    entries = signed_in.get("/api/history", params={"item_id": drill["id"]}).json()["items"]
    assert [(each["action"], each["actor"], each["username"]) for each in entries] == [
        ("item.updated", "app", "sam"),
        ("item.created", "app", "editor-account"),
    ]
