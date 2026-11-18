from typing import Any

import httpx2
import pytest
from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome


def _import(signed_in: TestClient, text: str | bytes) -> httpx2.Response:
    raw = text.encode() if isinstance(text, str) else text
    return signed_in.post("/api/import", files={"csv": ("items.csv", raw, "text/csv")})


def _paths(signed_in: TestClient) -> list[str]:
    tree = signed_in.get("/api/locations").json()["locations"]
    return [" > ".join(step["name"] for step in place["path"]) for place in tree]


def _items_in(signed_in: TestClient, location_id: str) -> list[dict[str, Any]]:
    listed: list[dict[str, Any]] = signed_in.get(
        "/api/items", params={"location_id": location_id}
    ).json()["items"]
    return listed


def _location_id(signed_in: TestClient, path: str) -> str:
    tree = signed_in.get("/api/locations").json()["locations"]
    found: str = next(
        place["id"] for place in tree if " > ".join(step["name"] for step in place["path"]) == path
    )
    return found


def test_an_import_adds_items_with_their_details_into_existing_and_new_locations(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    text = (
        "name,quantity,location,category,tags,price,purchase_date,serial_number\n"
        "Drill,1,home > garage > Shelf 3 > Bin 7,Tools,power; cordless,89.99,2025-03-01,SN-1\n"
        "AA batteries,12,Home > Garage > Shelf 3 > Bin 7,,,,,\n"
        "Spare HDMI,,B-014,,,,,\n"
        "Mystery cable,,,,,,,\n"
    )
    response = _import(signed_in, text)
    assert response.status_code == 200
    done = response.json()
    assert (done["items_created"], done["locations_created"]) == (4, 2)
    assert "Home > Garage > Shelf 3 > Bin 7" in _paths(signed_in)
    bin_seven = _location_id(signed_in, "Home > Garage > Shelf 3 > Bin 7")
    drill, batteries = _items_in(signed_in, bin_seven)
    assert (drill["name"], drill["category"], drill["tags"]) == (
        "Drill",
        "Tools",
        ["cordless", "power"],
    )
    assert (drill["price_cents"], drill["purchase_date"], drill["serial_number"]) == (
        8999,
        "2025-03-01",
        "SN-1",
    )
    assert batteries["quantity"] == 12
    assert "Spare HDMI" in [each["name"] for each in _items_in(signed_in, home.cables)]
    inbox = signed_in.get("/api/items/inbox").json()["items"]
    assert [each["name"] for each in inbox] == ["Mystery cable"]


def test_one_undo_takes_the_whole_import_back(signed_in: TestClient, home: AcceptanceHome) -> None:
    before = _paths(signed_in)
    done = _import(signed_in, "name,location\nDrill,Shed > Bench\nSaw,Shed > Bench\n").json()
    assert signed_in.post(f"/api/history/{done['history_entry_id']}/undo").status_code == 200
    assert _paths(signed_in) == before
    assert "Drill" not in [each["name"] for each in _items_in(signed_in, home.home)]


def test_undo_is_refused_once_something_was_put_in_a_new_location(
    signed_in: TestClient,
) -> None:
    done = _import(signed_in, "name,location\nDrill,Shed\n").json()
    shed = _location_id(signed_in, "Shed")
    signed_in.post("/api/items", json={"name": "Rake", "home_location_id": shed})
    response = signed_in.post(f"/api/history/{done['history_entry_id']}/undo")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "changed_since"


def test_a_file_with_bad_rows_is_refused_whole_saying_which_rows(signed_in: TestClient) -> None:
    text = "name,quantity,price,status\nDrill,two,,\nSaw,1,abc,\n,1,,\nTape,1,,lent_out\n"
    response = _import(signed_in, text)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "import_rows_invalid"
    assert [(row["row"], row["column"]) for row in error["details"]["rows"]] == [
        (2, "quantity"),
        (3, "price"),
        (4, "name"),
        (5, None),
    ]
    assert _paths(signed_in) == []


@pytest.mark.usefixtures("home")
def test_unknown_columns_and_unclaimed_label_codes_are_refused(signed_in: TestClient) -> None:
    unknown = _import(signed_in, "name,colour\nDrill,red\n").json()["error"]
    assert unknown["details"]["rows"][0]["message"] == "Unknown or missing columns: colour."
    blank = _import(signed_in, "name,location\nDrill,B-001\n").json()["error"]
    assert blank["details"]["rows"][0] == {
        "row": 2,
        "column": "location",
        "message": "No location has the label B-001; claim it first.",
    }


def test_a_file_that_is_not_text_is_refused(signed_in: TestClient) -> None:
    response = _import(signed_in, b"\xff\xfe\x00binary")
    assert response.json()["error"]["code"] == "unsupported_file"
