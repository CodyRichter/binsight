from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude

PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def test_what_is_in_cables_gives_both_items_and_the_bin_s_path(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    page = claude.call("list_items", location_id=home.cables)
    assert page == signed_in.get("/api/items", params={"location_id": home.cables}).json()
    assert [item["name"] for item in page["items"]] == ["HDMI cable", "USB-C charger"]
    assert [step["name"] for step in page["items"][0]["path"]] == PATH_TO_CABLES


def test_everything_inside_includes_the_locations_beneath(
    claude: Claude, home: AcceptanceHome
) -> None:
    page = claude.call("list_items", location_id=home.garage, everything_inside=True)
    assert len(page["items"]) == 2
    assert claude.call("list_items", location_id=home.garage)["items"] == []


def test_items_are_listed_a_page_at_a_time(claude: Claude, home: AcceptanceHome) -> None:
    first = claude.call("list_items", location_id=home.cables, limit=1)
    second = claude.call(
        "list_items", location_id=home.cables, limit=1, cursor=first["next_cursor"]
    )
    assert [item["name"] for item in first["items"] + second["items"]] == [
        "HDMI cable",
        "USB-C charger",
    ]
    assert second["next_cursor"] is None


def test_adding_an_item_to_cables_is_visible_through_the_api_at_once(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    created = claude.call("create_item", name="Ethernet cable", home_location_id=home.cables)
    assert created["home_location_id"] == home.cables
    through_api = signed_in.get(f"/api/items/{created['id']}").json()
    assert {**through_api, "history_entry_id": created["history_entry_id"]} == created


def test_an_item_added_without_a_location_goes_to_the_inbox(claude: Claude) -> None:
    created = claude.call("create_item", name="Multimeter")
    assert (created["home_location_id"], created["path"]) == (None, [])


def test_where_is_the_hdmi_cable_matches_the_api(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    hdmi_cable = claude.call("get_item", item_id=home.hdmi_cable)
    assert hdmi_cable == signed_in.get(f"/api/items/{home.hdmi_cable}").json()
    assert hdmi_cable["quantity"] == 3
    assert [step["name"] for step in hdmi_cable["path"]] == PATH_TO_CABLES


def test_changing_a_quantity_is_visible_through_the_api_at_once(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    updated = claude.call("update_item", item_id=home.hdmi_cable, quantity=2)
    through_api = signed_in.get(f"/api/items/{home.hdmi_cable}").json()
    assert {**through_api, "history_entry_id": updated["history_entry_id"]} == updated
    assert through_api["quantity"] == 2


def test_item_refusals_carry_the_api_s_codes(claude: Claude, home: AcceptanceHome) -> None:
    assert claude.refusal("get_item", item_id="made-up")["code"] == "item_not_found"
    assert claude.refusal("update_item", item_id="made-up", quantity=1)["code"] == "item_not_found"
    assert claude.refusal("list_items", location_id="made-up")["code"] == "location_not_found"
    bad_cursor = claude.refusal("list_items", location_id=home.cables, cursor="nope")
    assert bad_cursor["code"] == "invalid_cursor"


def test_item_inputs_are_refused_as_the_api_refuses_them(
    claude: Claude, home: AcceptanceHome
) -> None:
    negative = claude.refusal("update_item", item_id=home.hdmi_cable, quantity=-1)
    blank = claude.refusal("create_item", name=" ")
    too_many = claude.refusal("list_items", location_id=home.cables, limit=201)
    assert [refusal["code"] for refusal in (negative, blank, too_many)] == ["validation_failed"] * 3
    assert list(negative["details"]["fields"]) == ["quantity"]
    assert list(blank["details"]["fields"]) == ["name"]
    assert list(too_many["details"]["fields"]) == ["limit"]
