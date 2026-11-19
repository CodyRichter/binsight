import pytest

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_claude_runs_a_view(claude: Claude, home: AcceptanceHome) -> None:
    claude.call("lend_item", item_id=home.hdmi_cable, lent_to="Sam")
    views = {each["view"]: each["count"] for each in claude.call("list_views")["items"]}
    assert views["lent-out"] == 1
    rows = claude.call("list_view_rows", view="lent-out")["items"]
    assert [row["lent_to"] for row in rows] == ["Sam"]


@pytest.mark.usefixtures("home")
def test_claude_filters_a_search_by_a_label_code(claude: Claude) -> None:
    found = claude.call("search_home", filters={"location_id": "b14"})["results"]
    assert [each["item"]["name"] for each in found if each["kind"] == "item"] == [
        "HDMI cable",
        "USB-C charger",
    ]


def test_claude_saves_pins_and_deletes_a_search_once_confirmed(
    claude: Claude, home: AcceptanceHome
) -> None:
    made = claude.call("create_saved_search", name="In B-014", filters={"location_id": "B-014"})
    assert made["location_id"] == home.cables
    pinned = claude.call("update_saved_search", saved_search_id=made["id"], pinned=True)
    assert pinned["pinned"] is True
    assert claude.call("list_saved_search_rows", saved_search_id=made["id"])["count"] == 3
    asked = claude.call("delete_saved_search", saved_search_id=made["id"])
    assert claude.call("list_saved_searches")["items"][0]["name"] == "In B-014"
    token = asked["preview"]["confirmation_token"]
    claude.call("delete_saved_search", saved_search_id=made["id"], confirmation_token=token)
    assert claude.call("list_saved_searches")["items"] == []
