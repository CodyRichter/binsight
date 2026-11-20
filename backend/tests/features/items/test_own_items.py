from typing import Any, cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx2 import Response

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home
from tests.photos import photo

ITEMS = "/api/items"
LOCATIONS = "/api/locations"


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)


def _ok(response: Response) -> dict[str, Any]:
    assert response.status_code in (200, 201), response.json()
    answer: dict[str, Any] = response.json()
    return answer


def _make(client: TestClient, location_id: str) -> dict[str, Any]:
    return _ok(client.post(f"{ITEMS}/own-item", json={"location_id": location_id}))


def _location(client: TestClient, location_id: str) -> dict[str, Any]:
    return _ok(client.get(f"{LOCATIONS}/{location_id}"))


def _item(client: TestClient, item_id: str) -> dict[str, Any]:
    return _ok(client.get(f"{ITEMS}/{item_id}"))


def _undo(client: TestClient, answer: dict[str, Any]) -> None:
    _ok(client.post(f"/api/history/{answer['history_entry_id']}/undo"))


def _listed(client: TestClient, location_id: str, everything_inside: bool = False) -> list[str]:
    params: dict[str, str | bool] = {
        "location_id": location_id,
        "everything_inside": everything_inside,
    }
    page = _ok(client.get(ITEMS, params=params))
    return [item["name"] for item in page["items"]]


def test_tracking_a_location_makes_an_item_named_like_it_inside_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = _make(signed_in, home.shelf)
    assert (made["name"], made["home_location_id"], made["own_item_of"]) == (
        "Shelf 2",
        home.shelf,
        home.shelf,
    )
    assert _location(signed_in, home.shelf)["own_item_id"] == made["id"]


def test_the_own_item_gets_a_copy_of_the_location_photo_and_one_undo_removes_both(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    files = {"photo": ("shelf.jpg", photo(), "image/jpeg")}
    _ok(signed_in.post(f"{LOCATIONS}/{home.shelf}/photo", files=files))
    made = _make(signed_in, home.shelf)
    location_photo = _location(signed_in, home.shelf)["photo_url"]
    assert made["photo_url"]
    assert made["photo_url"] != location_photo
    _undo(signed_in, made)
    assert signed_in.get(f"{ITEMS}/{made['id']}").status_code == 404
    assert _location(signed_in, home.shelf)["own_item_id"] is None
    assert _location(signed_in, home.shelf)["photo_url"] == location_photo


def test_a_location_has_one_own_item(signed_in: TestClient, home: AcceptanceHome) -> None:
    _make(signed_in, home.shelf)
    again = signed_in.post(f"{ITEMS}/own-item", json={"location_id": home.shelf})
    assert (again.status_code, again.json()["error"]["code"]) == (409, "own_item_taken")
    linking = signed_in.patch(f"{ITEMS}/{home.hdmi_cable}", json={"own_item_of": home.shelf})
    assert linking.status_code == 409


def test_the_own_item_is_not_among_its_contents_but_counts_around_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    _make(signed_in, home.cables)
    assert _listed(signed_in, home.cables) == ["HDMI cable", "USB-C charger"]
    assert _listed(signed_in, home.shelf, everything_inside=True) == [
        "HDMI cable",
        "USB-C charger",
        "Cables",
    ]
    assert _location(signed_in, home.cables)["item_count"] == 2
    assert _location(signed_in, home.shelf)["item_count"] == 3
    insured = _ok(signed_in.get("/api/insurance-list", params={"location_id": home.shelf}))
    assert "Cables" in [item["name"] for item in insured["items"]]


def test_an_existing_item_linked_to_a_location_moves_into_it_and_unlinking_leaves_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    linked = _ok(signed_in.patch(f"{ITEMS}/{home.hdmi_cable}", json={"own_item_of": home.tools}))
    assert (linked["home_location_id"], linked["own_item_of"]) == (home.tools, home.tools)
    unlinked = _ok(signed_in.patch(f"{ITEMS}/{home.hdmi_cable}", json={"own_item_of": None}))
    assert (unlinked["home_location_id"], unlinked["own_item_of"]) == (home.tools, None)
    _undo(signed_in, unlinked)
    _undo(signed_in, linked)
    assert _item(signed_in, home.hdmi_cable)["home_location_id"] == home.cables


def test_moving_the_own_item_away_ends_the_link_and_undo_brings_it_back(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = _make(signed_in, home.tools)
    moved = _ok(signed_in.post(f"{ITEMS}/{made['id']}/move", json={"location_id": home.garage}))
    assert moved["own_item_of"] is None
    assert _location(signed_in, home.tools)["own_item_id"] is None
    _undo(signed_in, moved)
    assert _location(signed_in, home.tools)["own_item_id"] == made["id"]


def test_deleting_the_own_item_ends_the_link(signed_in: TestClient, home: AcceptanceHome) -> None:
    made = _make(signed_in, home.tools)
    deleted = _ok(signed_in.delete(f"{ITEMS}/{made['id']}"))
    assert _location(signed_in, home.tools)["own_item_id"] is None
    _undo(signed_in, deleted)
    assert _location(signed_in, home.tools)["own_item_id"] == made["id"]


def test_archiving_the_own_item_keeps_the_link(signed_in: TestClient, home: AcceptanceHome) -> None:
    made = _make(signed_in, home.tools)
    _ok(signed_in.post(f"{ITEMS}/{made['id']}/status", json={"status": "sold"}))
    assert _location(signed_in, home.tools)["own_item_id"] == made["id"]
    assert _location(signed_in, home.shelf)["item_count"] == 2


def test_merging_a_location_takes_its_own_item_along_as_the_other_one(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = _make(signed_in, home.tools)
    _ok(signed_in.post(f"{LOCATIONS}/{home.tools}/merge", json={"into": home.cables}))
    moved = _item(signed_in, made["id"])
    assert (moved["home_location_id"], moved["own_item_of"]) == (home.cables, home.cables)


def test_merging_into_a_location_with_its_own_item_keeps_that_one(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    tools = _make(signed_in, home.tools)
    cables = _make(signed_in, home.cables)
    _ok(signed_in.post(f"{LOCATIONS}/{home.tools}/merge", json={"into": home.cables}))
    assert _item(signed_in, tools["id"])["own_item_of"] is None
    assert _location(signed_in, home.cables)["own_item_id"] == cables["id"]


def test_deleting_an_otherwise_empty_location_puts_its_own_item_around_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = _make(signed_in, home.tools)
    deleted = _ok(signed_in.delete(f"{LOCATIONS}/{home.tools}"))
    kept = _item(signed_in, made["id"])
    assert (kept["home_location_id"], kept["own_item_of"]) == (home.shelf, None)
    _undo(signed_in, deleted)
    assert _location(signed_in, home.tools)["own_item_id"] == made["id"]


def test_deleting_a_location_into_another_moves_its_own_item_as_an_ordinary_one(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = _make(signed_in, home.tools)
    _ok(signed_in.delete(f"{LOCATIONS}/{home.tools}", params={"move_contents_to": home.cables}))
    moved = _item(signed_in, made["id"])
    assert (moved["home_location_id"], moved["own_item_of"]) == (home.cables, None)
