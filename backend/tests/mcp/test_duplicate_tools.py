from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def test_claude_copies_an_item_beside_it(claude: Claude, home: AcceptanceHome) -> None:
    copy = claude.call("duplicate_item", item_id=home.hdmi_cable)
    assert (copy["name"], copy["home_location_id"]) == ("HDMI cable", home.cables)
    assert copy["path"][-1]["name"] == "Cables"


def test_merging_previews_then_merges_with_the_token(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("merge_item", item_id=home.usb_c_charger, into=home.hdmi_cable)
    assert (asked["preview"]["item"]["name"], asked["preview"]["into"]["name"]) == (
        "USB-C charger",
        "HDMI cable",
    )
    assert signed_in.get(f"/api/items/{home.usb_c_charger}").json()["deleted_at"] is None
    token = asked["preview"]["confirmation_token"]
    merged = claude.call(
        "merge_item", item_id=home.usb_c_charger, into=home.hdmi_cable, confirmation_token=token
    )
    assert merged["merged"]["quantity"] == 4
    claude.call("undo_history_entry", entry_id=merged["merged"]["history_entry_id"])
    assert claude.call("get_item", item_id=home.hdmi_cable)["quantity"] == 3


def test_a_merge_token_is_only_for_the_pair_it_was_given_for(
    claude: Claude, home: AcceptanceHome
) -> None:
    asked = claude.call("merge_item", item_id=home.usb_c_charger, into=home.hdmi_cable)
    token = asked["preview"]["confirmation_token"]
    swapped = claude.refusal(
        "merge_item", item_id=home.hdmi_cable, into=home.usb_c_charger, confirmation_token=token
    )
    assert swapped["code"] == "confirmation_invalid"


def test_a_refused_merge_is_refused_before_any_token(claude: Claude, home: AcceptanceHome) -> None:
    itself = claude.refusal("merge_item", item_id=home.hdmi_cable, into=home.hdmi_cable)
    assert itself["code"] == "same_item"
