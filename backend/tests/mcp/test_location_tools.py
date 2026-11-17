import pytest
from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_creating_a_location_matches_the_api_and_is_recorded_as_mcp(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    created = claude.call("create_location", name="Drawer 1", type="drawer", parent_id=home.shelf)
    assert [step["name"] for step in created["path"]] == ["Home", "Garage", "Shelf 2", "Drawer 1"]
    through_api = signed_in.get(f"/api/locations/{created['id']}").json()
    assert {**through_api, "history_entry_id": created["history_entry_id"]} == created


@pytest.mark.usefixtures("home")
def test_the_location_tree_matches_the_api(claude: Claude, signed_in: TestClient) -> None:
    tree = claude.call("list_locations")
    assert tree == signed_in.get("/api/locations").json()
    assert {location["name"] for location in tree["locations"]} >= {"Cables", "Tools"}


def test_one_location_matches_the_api(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    cables = claude.call("get_location", location_id=home.cables)
    assert cables == signed_in.get(f"/api/locations/{home.cables}").json()
    assert cables["item_count"] == 2


def test_an_unknown_location_is_refused_with_the_api_s_code(claude: Claude) -> None:
    assert claude.refusal("get_location", location_id="made-up")["code"] == "location_not_found"


def test_a_room_without_a_parent_is_refused_as_the_api_refuses_it(claude: Claude) -> None:
    refusal = claude.refusal("create_location", name="Garage", type="room")
    assert refusal["code"] == "validation_failed"
    assert refusal["message"] == "A site has no parent, and every other location has one."


def test_a_blank_location_name_is_refused_with_the_field_named(claude: Claude) -> None:
    refusal = claude.refusal("create_location", name="  ", type="site")
    assert refusal["code"] == "validation_failed"
    assert list(refusal["details"]["fields"]) == ["name"]
