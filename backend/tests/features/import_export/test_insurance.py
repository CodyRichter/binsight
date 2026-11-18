from typing import Any

from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.photos import PDF, photo


def _insurance(signed_in: TestClient, location_id: str | None = None) -> dict[str, Any]:
    params = {} if location_id is None else {"location_id": location_id}
    response = signed_in.get("/api/insurance-list", params=params)
    assert response.status_code == 200
    answer: dict[str, Any] = response.json()
    return answer


def _named(listing: dict[str, Any]) -> list[str]:
    return [item["name"] for item in listing["items"]]


def test_the_whole_home_lists_every_item_still_owned_by_path(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post("/api/items", json={"name": "Passport"})
    drill = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": home.tools})
    sold = signed_in.post("/api/items", json={"name": "Old saw", "home_location_id": home.tools})
    gone = signed_in.post("/api/items", json={"name": "Torch", "home_location_id": home.tools})
    signed_in.post(f"/api/items/{sold.json()['id']}/status", json={"status": "sold"})
    signed_in.delete(f"/api/items/{gone.json()['id']}")
    signed_in.post(f"/api/items/{home.usb_c_charger}/mark-missing")
    signed_in.post(f"/api/items/{drill.json()['id']}/lend", json={"lent_to": "Sam"})
    listing = _insurance(signed_in)
    assert (listing["title"], listing["path"], listing["item_count"]) == ("Everything", [], 4)
    assert _named(listing) == ["Passport", "HDMI cable", "USB-C charger", "Drill"]
    assert [item["status"] for item in listing["items"]][2:] == ["missing", "lent_out"]


def test_one_location_lists_what_is_in_it_and_everything_inside(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post("/api/items", json={"name": "Drill", "home_location_id": home.tools})
    signed_in.post("/api/items", json={"name": "Passport"})
    shelf = _insurance(signed_in, home.shelf)
    assert shelf["title"] == "Shelf 2"
    assert [step["name"] for step in shelf["path"]] == ["Home", "Garage", "Shelf 2"]
    assert _named(shelf) == ["HDMI cable", "USB-C charger", "Drill"]
    assert _named(_insurance(signed_in, home.tools)) == ["Drill"]


def test_the_total_is_each_price_times_its_quantity(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"price_cents": 1250})
    listing = _insurance(signed_in)
    assert (listing["total_cents"], listing["items_without_price"]) == (3750, 1)


def test_each_item_carries_its_details_photos_and_receipts(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    cable = home.hdmi_cable
    details = {"serial_number": "SN-1", "brand": "Anker", "price_cents": 999}
    signed_in.patch(f"/api/items/{cable}", json=details)
    for name in ("a.jpg", "b.jpg"):
        signed_in.post(f"/api/items/{cable}/photos", files={"photo": (name, photo(), "image/jpeg")})
    signed_in.post(
        f"/api/items/{cable}/files", files={"file": ("Receipt.pdf", PDF, "application/pdf")}
    )
    link = {"url": "https://example.com/order", "name": "Order"}
    signed_in.post(f"/api/items/{cable}/web-links", json=link)
    listed = _insurance(signed_in, home.cables)["items"][0]
    assert (listed["serial_number"], listed["brand"], listed["price_cents"]) == (
        "SN-1",
        "Anker",
        999,
    )
    assert len(listed["photo_urls"]) == 2
    assert [receipt["name"] for receipt in listed["receipts"]] == ["Receipt.pdf", "Order"]
    assert listed["receipts"][1]["url"] == "https://example.com/order"
    assert [step["name"] for step in listed["path"]][-1] == "Cables"


def test_an_unknown_location_is_refused(signed_in: TestClient) -> None:
    response = signed_in.get("/api/insurance-list", params={"location_id": "nowhere"})
    assert (response.status_code, response.json()["error"]["code"]) == (404, "location_not_found")
