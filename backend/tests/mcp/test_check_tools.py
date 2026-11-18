from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_checking_b_014_with_nothing_missing_happens_at_once(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    answer = claude.call("check_location", location_id="B-014")
    assert answer["preview"] is None
    checked = answer["checked"]
    assert checked["id"] == home.cables
    through_api = signed_in.get(f"/api/locations/{home.cables}").json()
    assert through_api["last_checked_at"] == checked["last_checked_at"]
    found = claude.call("search_home", query="HDMI cable")["results"][0]["item"]
    assert found["last_checked_at"] == checked["last_checked_at"]


def test_marking_items_missing_waits_for_the_confirmation_step(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("check_location", location_id="B-014", missing_item_ids=[home.hdmi_cable])
    assert asked["checked"] is None
    assert [item["name"] for item in asked["preview"]["marked_missing"]] == ["HDMI cable"]
    assert signed_in.get(f"/api/locations/{home.cables}").json()["last_checked_at"] is None
    token = asked["confirmation_token"]
    done = claude.call(
        "check_location",
        location_id="B-014",
        missing_item_ids=[home.hdmi_cable],
        confirmation_token=token,
    )
    assert [item["status"] for item in done["checked"]["marked_missing"]] == ["missing"]
    reused = claude.refusal(
        "check_location",
        location_id="B-014",
        missing_item_ids=[home.usb_c_charger],
        confirmation_token=token,
    )
    assert reused["code"] == "confirmation_invalid"


def test_missing_then_found_somewhere_else(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    missing = claude.call("mark_item_missing", item_id=home.usb_c_charger)
    assert missing["status"] == "missing"
    found = claude.call("mark_item_found", item_id=home.usb_c_charger, location_id="B-015")
    assert (found["status"], found["home_location_id"]) == ("in_place", home.tools)
    history = signed_in.get("/api/history", params={"item_id": home.usb_c_charger}).json()
    assert (history["items"][0]["action"], history["items"][0]["actor"]) == ("item.found", "mcp")
    refused = claude.refusal("mark_item_found", item_id=home.usb_c_charger, location_id="B-015")
    assert refused["code"] == "not_missing"
