from typing import Any

from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome


def _sheet(signed_in: TestClient, location_id: str) -> dict[str, Any]:
    response = signed_in.get(f"/api/contents-sheet/{location_id}")
    assert response.status_code == 200
    answer: dict[str, Any] = response.json()
    return answer


def test_a_sheet_groups_everything_inside_by_location_parents_first(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post("/api/items", json={"name": "Tape", "home_location_id": home.garage})
    signed_in.post("/api/items", json={"name": "Drill", "home_location_id": home.tools})
    sheet = _sheet(signed_in, home.garage)
    assert sheet["location"]["name"] == "Garage"
    groups = [
        (group["path"][-1]["name"], group["label_code"], [item["name"] for item in group["items"]])
        for group in sheet["groups"]
    ]
    assert groups == [
        ("Garage", None, ["Tape"]),
        ("Shelf 2", None, []),
        ("Cables", "B-014", ["HDMI cable", "USB-C charger"]),
        ("Tools", "B-015", ["Drill"]),
    ]
    assert sheet["groups"][2]["items"][0]["quantity"] == 3


def test_a_bin_sheet_is_its_items_leaving_out_the_archive_and_deleted(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post(f"/api/items/{home.hdmi_cable}/status", json={"status": "given_away"})
    signed_in.delete(f"/api/items/{home.usb_c_charger}")
    signed_in.post("/api/items", json={"name": "Adapter", "home_location_id": home.cables})
    sheet = _sheet(signed_in, home.cables)
    assert [[item["name"] for item in group["items"]] for group in sheet["groups"]] == [["Adapter"]]


def test_an_unknown_location_has_no_sheet(signed_in: TestClient) -> None:
    response = signed_in.get("/api/contents-sheet/nowhere")
    assert (response.status_code, response.json()["error"]["code"]) == (404, "location_not_found")
