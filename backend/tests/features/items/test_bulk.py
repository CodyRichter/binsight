from typing import Any, cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home

BULK = "/api/items/bulk"


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)


def _item(client: TestClient, item_id: str) -> dict[str, Any]:
    found: dict[str, Any] = client.get(f"/api/items/{item_id}").json()
    return found


def _both(home: AcceptanceHome) -> list[str]:
    return [home.hdmi_cable, home.usb_c_charger]


def _undo(client: TestClient, answer: dict[str, Any]) -> None:
    undone = client.post(f"/api/history/{answer['history_entry_id']}/undo")
    assert undone.status_code == 200, undone.json()


def _refusal(client: TestClient, action: str, body: dict[str, Any]) -> tuple[int, str]:
    answer = client.post(f"{BULK}/{action}", json=body)
    return answer.status_code, answer.json()["error"]["code"]


def test_moving_many_items_and_undoing_the_batch_in_one_step(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    moved = signed_in.post(
        f"{BULK}/move", json={"item_ids": _both(home), "location_id": home.tools}
    ).json()
    assert [item["path"][-1]["name"] for item in moved["items"]] == ["Tools", "Tools"]
    assert _item(signed_in, home.usb_c_charger)["home_location_id"] == home.tools
    _undo(signed_in, moved)
    homes = {_item(signed_in, item_id)["home_location_id"] for item_id in _both(home)}
    assert homes == {home.cables}


def test_items_already_there_are_left_out_and_all_there_is_refused(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post(f"/api/items/{home.hdmi_cable}/move", json={"location_id": home.tools})
    moved = signed_in.post(
        f"{BULK}/move", json={"item_ids": _both(home), "location_id": home.tools}
    ).json()
    assert [item["id"] for item in moved["items"]] == [home.usb_c_charger]
    body = {"item_ids": _both(home), "location_id": home.tools}
    assert _refusal(signed_in, "move", body) == (409, "already_there")


def test_one_unknown_or_deleted_item_refuses_the_batch_and_changes_nothing(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    unknown = {"item_ids": [home.hdmi_cable, "nope"], "location_id": home.tools}
    assert _refusal(signed_in, "move", unknown) == (404, "item_not_found")
    signed_in.delete(f"/api/items/{home.usb_c_charger}")
    deleted = {"item_ids": _both(home), "tag": "av"}
    assert _refusal(signed_in, "tag", deleted) == (409, "item_deleted")
    assert _item(signed_in, home.hdmi_cable)["home_location_id"] == home.cables
    assert _item(signed_in, home.hdmi_cable)["tags"] == []


def test_moving_into_a_deleted_location_is_refused(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.delete(f"/api/locations/{home.tools}")
    body = {"item_ids": _both(home), "location_id": home.tools}
    assert _refusal(signed_in, "move", body) == (409, "location_deleted")


def test_tagging_adds_one_tag_once_and_keeps_the_others(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"tags": ["av", "spare"]})
    tagged = signed_in.post(f"{BULK}/tag", json={"item_ids": _both(home), "tag": " AV "}).json()
    assert [item["id"] for item in tagged["items"]] == [home.usb_c_charger]
    assert _item(signed_in, home.hdmi_cable)["tags"] == ["av", "spare"]
    assert _item(signed_in, home.usb_c_charger)["tags"] == ["av"]
    _undo(signed_in, tagged)
    assert _item(signed_in, home.usb_c_charger)["tags"] == []
    body = {"item_ids": [home.hdmi_cable], "tag": "av"}
    assert _refusal(signed_in, "tag", body) == (409, "already_tagged")


def test_giving_many_items_a_category_and_clearing_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    given = signed_in.post(
        f"{BULK}/category", json={"item_ids": _both(home), "category": "Cables"}
    ).json()
    assert [item["category"] for item in given["items"]] == ["Cables", "Cables"]
    same = {"item_ids": _both(home), "category": "cables"}
    assert _refusal(signed_in, "category", same) == (409, "category_unchanged")
    cleared = signed_in.post(
        f"{BULK}/category", json={"item_ids": _both(home), "category": None}
    ).json()
    assert [item["category"] for item in cleared["items"]] == [None, None]
    _undo(signed_in, cleared)
    assert _item(signed_in, home.usb_c_charger)["category"] == "Cables"


def test_giving_many_items_a_status_and_undoing_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    sold = signed_in.post(f"{BULK}/status", json={"item_ids": _both(home), "status": "sold"}).json()
    assert [(item["status"], item["retired_at"] is not None) for item in sold["items"]] == [
        ("sold", True),
        ("sold", True),
    ]
    _undo(signed_in, sold)
    assert _item(signed_in, home.hdmi_cable)["status"] == "in_place"
    assert _item(signed_in, home.hdmi_cable)["retired_at"] is None
    body = {"item_ids": _both(home), "status": "in_place"}
    assert _refusal(signed_in, "status", body) == (409, "status_unchanged")


def test_a_missing_item_can_t_be_put_back_in_place_in_bulk(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post(f"/api/items/{home.hdmi_cable}/mark-missing")
    signed_in.post(f"/api/items/{home.usb_c_charger}/status", json={"status": "in_use"})
    body = {"item_ids": _both(home), "status": "in_place"}
    assert _refusal(signed_in, "status", body) == (409, "use_mark_found")
    assert _item(signed_in, home.usb_c_charger)["status"] == "in_use"


@pytest.mark.usefixtures("home")
def test_lending_is_not_a_bulk_status_and_a_batch_has_limits(signed_in: TestClient) -> None:
    lent = signed_in.post(f"{BULK}/status", json={"item_ids": ["a"], "status": "lent_out"})
    assert lent.status_code == 422
    empty = signed_in.post(f"{BULK}/tag", json={"item_ids": [], "tag": "av"})
    assert empty.status_code == 422
    many = signed_in.post(
        f"{BULK}/tag", json={"item_ids": [str(n) for n in range(501)], "tag": "x"}
    )
    assert many.status_code == 422


def test_a_batch_shows_in_each_item_s_history(signed_in: TestClient, home: AcceptanceHome) -> None:
    signed_in.post(f"{BULK}/tag", json={"item_ids": _both(home), "tag": "av"})
    for item_id in _both(home):
        entries = signed_in.get("/api/history", params={"item_id": item_id}).json()["items"]
        assert entries[0]["action"] == "item.updated"


def test_deleting_many_items_takes_them_out_of_view_and_one_undo_brings_them_back(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    deleted = signed_in.post(f"{BULK}/delete", json={"item_ids": _both(home)}).json()
    assert [item["name"] for item in deleted["items"]] == ["HDMI cable", "USB-C charger"]
    assert _item(signed_in, home.hdmi_cable)["deleted_at"] is not None
    entries = signed_in.get("/api/history", params={"item_id": home.usb_c_charger}).json()
    assert entries["items"][0]["action"] == "item.deleted"
    _undo(signed_in, deleted)
    assert _item(signed_in, home.usb_c_charger)["deleted_at"] is None
    assert _item(signed_in, home.hdmi_cable)["deleted_at"] is None


def test_a_deleted_item_refuses_the_whole_delete(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.delete(f"/api/items/{home.hdmi_cable}")
    assert _refusal(signed_in, "delete", {"item_ids": _both(home)}) == (409, "item_deleted")
    assert _item(signed_in, home.usb_c_charger)["deleted_at"] is None


def test_lending_many_items_to_one_person_and_undoing_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    lent = signed_in.post(f"{BULK}/lend", json={"item_ids": _both(home), "lent_to": "Dana"}).json()
    assert [(item["status"], item["lent_to"]) for item in lent["items"]] == [
        ("lent_out", "Dana"),
        ("lent_out", "Dana"),
    ]
    assert _item(signed_in, home.hdmi_cable)["home_location_id"] == home.cables
    _undo(signed_in, lent)
    assert _item(signed_in, home.hdmi_cable)["status"] == "in_place"
    assert _item(signed_in, home.usb_c_charger)["lent_to"] is None


def test_items_already_lent_to_them_are_left_out_and_archived_ones_refused(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.post(f"/api/items/{home.hdmi_cable}/lend", json={"lent_to": "Dana"})
    lent = signed_in.post(f"{BULK}/lend", json={"item_ids": _both(home), "lent_to": "Dana"}).json()
    assert [item["id"] for item in lent["items"]] == [home.usb_c_charger]
    body = {"item_ids": _both(home), "lent_to": "Dana"}
    assert _refusal(signed_in, "lend", body) == (409, "status_unchanged")
    signed_in.post(f"/api/items/{home.hdmi_cable}/status", json={"status": "sold"})
    body = {"item_ids": _both(home), "lent_to": "Sam"}
    assert _refusal(signed_in, "lend", body) == (409, "item_archived")
    assert _item(signed_in, home.usb_c_charger)["lent_to"] == "Dana"
