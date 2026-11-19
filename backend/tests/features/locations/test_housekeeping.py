from typing import Any, cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home

LOCATIONS = "/api/locations"


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)


def _location(client: TestClient, location_id: str) -> dict[str, Any]:
    found: dict[str, Any] = client.get(f"{LOCATIONS}/{location_id}").json()
    return found


def _tree_names(client: TestClient) -> list[str]:
    return [location["name"] for location in client.get(LOCATIONS).json()["locations"]]


def _undo(client: TestClient, answer: dict[str, Any]) -> None:
    undone = client.post(f"/api/history/{answer['history_entry_id']}/undo")
    assert undone.status_code == 200, undone.json()


def _item_path(client: TestClient, item_id: str) -> list[str]:
    return [step["name"] for step in client.get(f"/api/items/{item_id}").json()["path"]]


def _add(client: TestClient, name: str, parent_id: str) -> str:
    made = client.post(LOCATIONS, json={"name": name, "type": "bin", "parent_id": parent_id})
    location_id: str = made.json()["id"]
    return location_id


def test_renaming_and_describing_a_location_and_undoing_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    changed = signed_in.patch(
        f"{LOCATIONS}/{home.cables}", json={"name": " Wires ", "summary": "spare network cables"}
    ).json()
    assert (changed["name"], changed["summary"]) == ("Wires", "spare network cables")
    assert _item_path(signed_in, home.hdmi_cable)[-1] == "Wires"
    _undo(signed_in, changed)
    assert (
        _location(signed_in, home.cables)["name"],
        _location(signed_in, home.cables)["summary"],
    ) == ("Cables", None)


def test_a_name_can_t_be_cleared_and_an_empty_summary_clears_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    assert signed_in.patch(f"{LOCATIONS}/{home.cables}", json={"name": None}).status_code == 422
    assert signed_in.patch(f"{LOCATIONS}/{home.cables}", json={"name": " "}).status_code == 422
    signed_in.patch(f"{LOCATIONS}/{home.cables}", json={"summary": "cables"})
    cleared = signed_in.patch(f"{LOCATIONS}/{home.cables}", json={"summary": ""}).json()
    assert (cleared["name"], cleared["summary"]) == ("Cables", None)


def test_deleting_moves_the_contents_and_undo_puts_them_back(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    inner = _add(signed_in, "Small parts", home.cables)
    deleted = signed_in.delete(
        f"{LOCATIONS}/{home.cables}", params={"move_contents_to": home.tools}
    ).json()
    assert deleted["deleted_at"] is not None
    assert _item_path(signed_in, home.hdmi_cable)[-1] == "Tools"
    assert _location(signed_in, inner)["parent_id"] == home.tools
    assert "Cables" not in _tree_names(signed_in)
    _undo(signed_in, deleted)
    assert _location(signed_in, home.cables)["deleted_at"] is None
    assert _location(signed_in, inner)["parent_id"] == home.cables
    assert _item_path(signed_in, home.hdmi_cable)[-1] == "Cables"


def test_deleting_with_contents_and_nowhere_to_put_them_is_refused(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    refused = signed_in.delete(f"{LOCATIONS}/{home.cables}")
    assert refused.json()["error"]["code"] == "location_has_contents"
    empty = _add(signed_in, "Empty", home.shelf)
    assert signed_in.delete(f"{LOCATIONS}/{empty}").status_code == 200


def test_contents_can_t_go_into_the_location_or_anything_inside_it(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    for destination in (home.cables, _add(signed_in, "Inner", home.cables)):
        deleting = signed_in.delete(
            f"{LOCATIONS}/{home.cables}", params={"move_contents_to": destination}
        )
        merging = signed_in.post(f"{LOCATIONS}/{home.cables}/merge", json={"into": destination})
        for refused in (deleting, merging):
            assert refused.json()["error"]["code"] == "move_into_itself"


def test_a_deleted_location_leaves_search_and_takes_nothing_new(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    empty = _add(signed_in, "Spare bin", home.shelf)
    signed_in.delete(f"{LOCATIONS}/{empty}")
    found = signed_in.get("/api/search", params={"query": "Spare bin"}).json()["results"]
    assert [row["location"]["id"] for row in found if row["kind"] == "location"] == []
    moved = signed_in.post(f"/api/items/{home.hdmi_cable}/move", json={"location_id": empty})
    assert moved.json()["error"]["code"] == "location_deleted"
    renamed = signed_in.patch(f"{LOCATIONS}/{empty}", json={"name": "Again"})
    assert renamed.json()["error"]["code"] == "location_deleted"


def test_a_deleted_location_s_label_still_names_it_and_it_can_be_restored(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.delete(f"{LOCATIONS}/{home.tools}")
    label = signed_in.get("/api/labels/B-015").json()
    assert label["location_id"] == home.tools
    assert _location(signed_in, home.tools)["deleted_at"] is not None
    restored = signed_in.post(f"{LOCATIONS}/{home.tools}/restore").json()
    assert restored["deleted_at"] is None
    assert "Tools" in _tree_names(signed_in)
    again = signed_in.post(f"{LOCATIONS}/{home.tools}/restore")
    assert again.json()["error"]["code"] == "not_deleted"


def test_a_location_inside_a_deleted_one_can_t_be_restored_first(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.delete(f"{LOCATIONS}/{home.tools}")
    signed_in.delete(f"{LOCATIONS}/{home.cables}", params={"move_contents_to": home.garage})
    signed_in.delete(f"{LOCATIONS}/{home.shelf}", params={"move_contents_to": home.garage})
    refused = signed_in.post(f"{LOCATIONS}/{home.tools}/restore")
    assert refused.json()["error"]["code"] == "parent_deleted"
    signed_in.post(f"{LOCATIONS}/{home.shelf}/restore")
    assert signed_in.post(f"{LOCATIONS}/{home.tools}/restore").status_code == 200


def test_merging_moves_items_checks_and_the_label_when_the_target_has_none(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    checked = signed_in.post(f"/api/locations/{home.cables}/check", json={"missing_item_ids": []})
    assert checked.status_code == 200, checked.json()
    target = _add(signed_in, "Everything bin", home.shelf)
    merged = signed_in.post(f"{LOCATIONS}/{home.cables}/merge", json={"into": target}).json()
    assert (merged["id"], merged["direct_item_count"]) == (target, 2)
    assert merged["last_checked_at"] is not None
    assert merged["label_code"] == "B-014"
    assert _location(signed_in, home.cables)["deleted_at"] is not None
    _undo(signed_in, merged)
    assert _location(signed_in, home.cables)["label_code"] == "B-014"
    assert _location(signed_in, target)["direct_item_count"] == 0


def test_merging_into_a_labeled_location_leaves_the_label_on_the_merged_one(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    merged = signed_in.post(f"{LOCATIONS}/{home.cables}/merge", json={"into": home.tools}).json()
    assert merged["label_code"] == "B-015"
    assert signed_in.get("/api/labels/B-014").json()["location_id"] == home.cables


def test_reordering_renumbers_siblings_and_new_locations_go_last(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    bins = _add(signed_in, "Bins", home.shelf)

    def shelf_names() -> list[str]:
        return [
            row["name"]
            for row in signed_in.get(LOCATIONS).json()["locations"]
            if row["parent_id"] == home.shelf
        ]

    assert shelf_names() == ["Cables", "Tools", "Bins"]
    moved = signed_in.post(f"{LOCATIONS}/{bins}/reorder", json={"position": 0}).json()
    assert shelf_names() == ["Bins", "Cables", "Tools"]
    signed_in.post(f"{LOCATIONS}/{home.cables}/reorder", json={"position": 99})
    assert shelf_names() == ["Bins", "Tools", "Cables"]
    same = signed_in.post(f"{LOCATIONS}/{home.cables}/reorder", json={"position": 2})
    assert same.json()["error"]["code"] == "already_there"
    assert (
        signed_in.post(f"/api/history/{moved['history_entry_id']}/undo").json()["error"]["code"]
        == "changed_since"
    )


def test_undoing_one_reorder_puts_every_sibling_back(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    moved = signed_in.post(f"{LOCATIONS}/{home.tools}/reorder", json={"position": 0}).json()
    _undo(signed_in, moved)
    names = [
        row["name"]
        for row in signed_in.get(LOCATIONS).json()["locations"]
        if row["parent_id"] == home.shelf
    ]
    assert names == ["Cables", "Tools"]


@pytest.mark.parametrize(
    ("method", "action"),
    [
        ("patch", ""),
        ("delete", ""),
        ("post", "/merge"),
        ("post", "/restore"),
        ("post", "/reorder"),
    ],
)
def test_housekeeping_needs_signing_in(client: TestClient, method: str, action: str) -> None:
    response = client.request(method.upper(), f"{LOCATIONS}/anything{action}", json={})
    assert response.status_code == 401
