from typing import Any, cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home
from tests.photos import photo


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)


def _item(client: TestClient, item_id: str) -> dict[str, Any]:
    found: dict[str, Any] = client.get(f"/api/items/{item_id}").json()
    return found


def _undo(client: TestClient, answer: dict[str, Any]) -> None:
    undone = client.post(f"/api/history/{answer['history_entry_id']}/undo")
    assert undone.status_code == 200, undone.json()


def _linked_ids(client: TestClient, item_id: str) -> list[str]:
    links = client.get(f"/api/items/{item_id}/links").json()["items"]
    return sorted(link["item"]["id"] for link in links)


def _merge(client: TestClient, item_id: str, into: str) -> dict[str, Any]:
    merged = client.post(f"/api/items/{item_id}/merge", json={"into": into})
    assert merged.status_code == 200, merged.json()
    answer: dict[str, Any] = merged.json()
    return answer


DETAILS = {
    "category": "Cables",
    "tags": ["av", "hdmi"],
    "brand": "Anker",
    "model": "A8",
    "notes": "2 m",
    "price_cents": 1299,
    "purchase_date": "2026-01-05",
    "warranty_ends": "2028-01-05",
    "serial_number": "SN-1",
}


def test_a_copy_keeps_what_describes_the_thing_but_not_what_is_this_one(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json=DETAILS)
    signed_in.post(f"/api/items/{home.hdmi_cable}/lend", json={"lent_to": "Dana"})
    copied = signed_in.post(f"/api/items/{home.hdmi_cable}/duplicate")
    assert copied.status_code == 201, copied.json()
    copy = copied.json()
    assert copy["id"] != home.hdmi_cable
    assert (copy["name"], copy["home_location_id"]) == ("HDMI cable", home.cables)
    kept = {key: copy[key] for key in DETAILS if key != "serial_number"}
    assert kept == {key: value for key, value in DETAILS.items() if key != "serial_number"}
    assert (copy["serial_number"], copy["quantity"], copy["status"]) == (None, 1, "in_place")


def test_undoing_a_copy_removes_it(signed_in: TestClient, home: AcceptanceHome) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"tags": ["av"]})
    copy = signed_in.post(f"/api/items/{home.hdmi_cable}/duplicate").json()
    _undo(signed_in, copy)
    assert signed_in.get(f"/api/items/{copy['id']}").status_code == 404


def test_a_deleted_item_is_not_copied(signed_in: TestClient, home: AcceptanceHome) -> None:
    signed_in.delete(f"/api/items/{home.hdmi_cable}")
    refused = signed_in.post(f"/api/items/{home.hdmi_cable}/duplicate")
    assert (refused.status_code, refused.json()["error"]["code"]) == (409, "item_deleted")


def test_merging_adds_the_count_joins_tags_and_fills_only_what_into_lacks(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"brand": "Anker", "tags": ["av"]})
    signed_in.patch(
        f"/api/items/{home.usb_c_charger}",
        json={"brand": "Belkin", "notes": "65 W", "tags": ["power"], "quantity": 2},
    )
    merged = _merge(signed_in, home.usb_c_charger, home.hdmi_cable)
    assert merged["id"] == home.hdmi_cable
    assert (merged["quantity"], merged["brand"], merged["notes"]) == (5, "Anker", "65 W")
    assert merged["tags"] == ["av", "power"]
    assert _item(signed_in, home.usb_c_charger)["deleted_at"] is not None


def test_merging_moves_photos_and_files_after_into_own(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    for item_id, name in ((home.hdmi_cable, "a.jpg"), (home.usb_c_charger, "b.jpg")):
        signed_in.post(
            f"/api/items/{item_id}/photos", files={"photo": (name, photo(), "image/jpeg")}
        )
    signed_in.post(
        f"/api/items/{home.usb_c_charger}/web-links", json={"url": "https://example.com/manual"}
    )
    _merge(signed_in, home.usb_c_charger, home.hdmi_cable)
    attached = signed_in.get(f"/api/items/{home.hdmi_cable}/attachments").json()["items"]
    assert [each["filename"] or each["url"] for each in attached] == [
        "a.jpg",
        "b.jpg",
        "https://example.com/manual",
    ]


def test_merging_repoints_links_and_drops_those_that_would_repeat_or_join_it_to_itself(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    drill = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": home.tools})
    drill_id = drill.json()["id"]
    for item_id, other in (
        (home.usb_c_charger, drill_id),
        (home.hdmi_cable, drill_id),
        (home.usb_c_charger, home.hdmi_cable),
    ):
        signed_in.post(
            f"/api/items/{item_id}/links", json={"other_item_id": other, "kind": "belongs_with"}
        )
    _merge(signed_in, home.usb_c_charger, home.hdmi_cable)
    assert _linked_ids(signed_in, home.hdmi_cable) == [drill_id]


def test_one_undo_separates_merged_items_again(signed_in: TestClient, home: AcceptanceHome) -> None:
    signed_in.post(
        f"/api/items/{home.usb_c_charger}/photos", files={"photo": ("b.jpg", photo(), "image/jpeg")}
    )
    signed_in.patch(f"/api/items/{home.usb_c_charger}", json={"tags": ["power"]})
    merged = _merge(signed_in, home.usb_c_charger, home.hdmi_cable)
    _undo(signed_in, merged)
    into, back = _item(signed_in, home.hdmi_cable), _item(signed_in, home.usb_c_charger)
    assert (into["quantity"], into["tags"], into["photo_url"]) == (3, [], None)
    assert (back["deleted_at"], back["tags"]) == (None, ["power"])
    assert back["photo_url"] is not None


def test_merging_into_itself_or_a_deleted_item_is_refused(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    itself = signed_in.post(f"/api/items/{home.hdmi_cable}/merge", json={"into": home.hdmi_cable})
    assert (itself.status_code, itself.json()["error"]["code"]) == (409, "same_item")
    signed_in.delete(f"/api/items/{home.usb_c_charger}")
    deleted = signed_in.post(
        f"/api/items/{home.hdmi_cable}/merge", json={"into": home.usb_c_charger}
    )
    assert (deleted.status_code, deleted.json()["error"]["code"]) == (409, "item_deleted")
    assert _item(signed_in, home.hdmi_cable)["deleted_at"] is None


def test_copying_and_merging_need_sign_in(client: TestClient) -> None:
    assert client.post("/api/items/any/duplicate").status_code == 401
    assert client.post("/api/items/any/merge", json={"into": "other"}).status_code == 401


def test_merging_drops_a_part_of_link_that_would_make_a_cycle(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    kit = signed_in.post("/api/items", json={"name": "Kit", "home_location_id": home.tools})
    kit_id = kit.json()["id"]
    for part, whole in ((home.usb_c_charger, kit_id), (kit_id, home.hdmi_cable)):
        signed_in.post(f"/api/items/{part}/links", json={"other_item_id": whole, "kind": "part_of"})
    _merge(signed_in, home.usb_c_charger, home.hdmi_cable)
    links = signed_in.get(f"/api/items/{home.hdmi_cable}/links").json()["items"]
    assert [(link["kind"], link["item"]["id"]) for link in links] == [("part", kit_id)]
