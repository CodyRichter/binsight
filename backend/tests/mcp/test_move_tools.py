from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_moving_an_item_to_a_location_code_matches_the_api(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    moved = claude.call("move_item", item_id=home.usb_c_charger, location_id=home.tools)
    assert [step["name"] for step in moved["path"]] == ["Home", "Garage", "Shelf 2", "Tools"]
    through_api = signed_in.get(f"/api/items/{home.usb_c_charger}").json()
    assert {**through_api, "history_entry_id": moved["history_entry_id"]} == moved
    history = signed_in.get("/api/history", params={"item_id": home.usb_c_charger}).json()
    assert (history["items"][0]["action"], history["items"][0]["actor"]) == ("item.moved", "mcp")


def test_moving_a_bin_by_its_code_moves_what_is_in_it(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    moved = claude.call("move_location", location_id=home.cables, parent_id=home.garage)
    assert [step["name"] for step in moved["path"]] == ["Home", "Garage", "Cables"]
    cable = signed_in.get(f"/api/items/{home.hdmi_cable}").json()
    assert [step["name"] for step in cable["path"]] == ["Home", "Garage", "Cables"]
    claude.call("undo_history_entry", entry_id=moved["history_entry_id"])
    assert signed_in.get(f"/api/locations/{home.cables}").json()["parent_id"] == home.shelf


def test_moves_are_refused_with_the_api_s_codes(claude: Claude, home: AcceptanceHome) -> None:
    into_itself = claude.refusal("move_location", location_id=home.shelf, parent_id=home.cables)
    assert into_itself["code"] == "move_into_itself"
    already = claude.refusal("move_item", item_id=home.hdmi_cable, location_id=home.cables)
    assert already["code"] == "already_there"
