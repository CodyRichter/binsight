"""Flow 5 of docs/acceptance.md: each request asked of Claude, through the MCP tools."""

import pytest
from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def _actors(client: TestClient, item_id: str) -> list[str]:
    history = client.get("/api/history", params={"item_id": item_id}).json()
    return [entry["actor"] for entry in history["items"]]


@pytest.mark.usefixtures("home")
def test_what_is_in_b_014_gives_both_items_and_the_bin_s_path(claude: Claude) -> None:
    listed = claude.call("list_items", location_id="B-014")
    assert [item["name"] for item in listed["items"]] == ["HDMI cable", "USB-C charger"]
    path = [step["name"] for step in listed["items"][0]["path"]]
    assert path == ["Home", "Garage", "Shelf 2", "Cables"]


def test_adding_ethernet_cable_to_b_014_puts_it_in_cables(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    added = claude.call("create_item", name="Ethernet cable", home_location_id="B-014")
    assert signed_in.get(f"/api/items/{added['id']}").json()["home_location_id"] == home.cables
    assert _actors(signed_in, added["id"]) == ["mcp"]


@pytest.mark.usefixtures("home")
def test_where_is_the_hdmi_cable_gives_its_path_code_and_quantity(claude: Claude) -> None:
    found = claude.call("search_home", query="HDMI cable")["results"][0]["item"]
    assert [step["name"] for step in found["path"]] == ["Home", "Garage", "Shelf 2", "Cables"]
    assert found["path"][-1]["label_code"] == "B-014"
    assert found["quantity"] == 3


@pytest.mark.usefixtures("home")
def test_do_i_own_a_multimeter_is_a_clear_no(claude: Claude) -> None:
    assert claude.call("search_home", query="multimeter")["results"] == []


def test_moving_the_usb_c_charger_to_b_015_puts_it_in_tools(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    claude.call("move_item", item_id=home.usb_c_charger, location_id="B-015")
    item = signed_in.get(f"/api/items/{home.usb_c_charger}").json()
    assert item["home_location_id"] == home.tools
    assert _actors(signed_in, home.usb_c_charger)[0] == "mcp"


def test_deleting_waits_for_the_confirmation_step(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    token = claude.call("delete_item", item_id=home.hdmi_cable)["preview"]["confirmation_token"]
    assert signed_in.get(f"/api/items/{home.hdmi_cable}").json()["deleted_at"] is None
    claude.call("delete_item", item_id=home.hdmi_cable, confirmation_token=token)
    assert signed_in.get(f"/api/items/{home.hdmi_cable}").json()["deleted_at"] is not None
    assert _actors(signed_in, home.hdmi_cable)[0] == "mcp"
