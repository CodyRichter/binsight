from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_an_item_s_history_matches_the_api(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    history = claude.call("list_history", item_id=home.hdmi_cable)
    assert history == signed_in.get("/api/history", params={"item_id": home.hdmi_cable}).json()
    assert [entry["action"] for entry in history["items"]] == ["item.updated", "item.created"]


def test_changes_made_through_mcp_have_the_actor_mcp(claude: Claude, home: AcceptanceHome) -> None:
    created = claude.call("create_item", name="Ethernet cable", home_location_id=home.cables)
    claude.call("update_item", item_id=created["id"], quantity=4)
    history = claude.call("list_history", item_id=created["id"])
    assert [(entry["actor"], entry["action"]) for entry in history["items"]] == [
        ("mcp", "item.updated"),
        ("mcp", "item.created"),
    ]


def test_an_item_in_a_location_made_through_mcp_has_the_actor_mcp(
    claude: Claude, home: AcceptanceHome
) -> None:
    created = claude.call("create_location", name="Drawer 1", type="drawer", parent_id=home.shelf)
    item = claude.call("create_item", name="Fuses", home_location_id=created["id"])
    history = claude.call("list_history", item_id=item["id"])
    assert history["items"][0]["actor"] == "mcp"


def test_history_is_read_a_page_at_a_time(claude: Claude, home: AcceptanceHome) -> None:
    first = claude.call("list_history", item_id=home.hdmi_cable, limit=1)
    second = claude.call(
        "list_history", item_id=home.hdmi_cable, limit=1, cursor=first["next_cursor"]
    )
    assert [entry["action"] for entry in first["items"] + second["items"]] == [
        "item.updated",
        "item.created",
    ]
    assert claude.refusal("list_history", item_id=home.hdmi_cable, cursor="nope")["code"] == (
        "invalid_cursor"
    )
