from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_claude_lends_and_gets_back_an_item(claude: Claude, home: AcceptanceHome) -> None:
    lent = claude.call("lend_item", item_id=home.hdmi_cable, lent_to="Sam")
    assert (lent["status"], lent["lent_to"]) == ("lent_out", "Sam")
    assert claude.call("list_lent_to_names")["items"] == [{"name": "Sam"}]
    returned = claude.call("return_item", item_id=home.hdmi_cable)
    assert (returned["status"], returned["lent_to"]) == ("in_place", None)
    assert claude.refusal("return_item", item_id=home.hdmi_cable)["code"] == "not_lent"


def test_claude_retires_an_item_to_the_archive(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    sold = claude.call("change_item_status", item_id=home.hdmi_cable, status="sold")
    assert sold["retired_at"] is not None
    assert signed_in.get(f"/api/locations/{home.cables}").json()["direct_item_count"] == 1
    found = claude.call("search_home", query="hdmi")["results"][0]["item"]
    assert found["status"] == "sold"


def test_claude_links_a_charger_to_what_it_charges(claude: Claude, home: AcceptanceHome) -> None:
    linked = claude.call(
        "link_items", item_id=home.usb_c_charger, other_item_id=home.hdmi_cable, kind="part_of"
    )
    listed = claude.call("list_item_links", item_id=home.hdmi_cable)["items"]
    assert [(each["kind"], each["item"]["name"]) for each in listed] == [("part", "USB-C charger")]
    claude.call("unlink_items", link_id=linked["link_id"])
    assert claude.call("list_item_links", item_id=home.hdmi_cable)["items"] == []
    assert claude.refusal("unlink_items", link_id=linked["link_id"])["code"] == "link_not_found"
