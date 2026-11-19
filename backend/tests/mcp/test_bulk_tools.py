from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def _both(home: AcceptanceHome) -> list[str]:
    return [home.hdmi_cable, home.usb_c_charger]


def test_moving_many_items_by_code_previews_then_moves_with_the_token(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("move_items", item_ids=_both(home), location_id="B-015")
    assert [item["name"] for item in asked["preview"]["items"]] == ["HDMI cable", "USB-C charger"]
    assert signed_in.get(f"/api/locations/{home.tools}").json()["direct_item_count"] == 0
    token = asked["preview"]["confirmation_token"]
    moved = claude.call(
        "move_items", item_ids=_both(home), location_id="B-015", confirmation_token=token
    )
    assert {item["home_location_id"] for item in moved["changed"]["items"]} == {home.tools}
    again = claude.refusal(
        "move_items", item_ids=_both(home), location_id=home.cables, confirmation_token=token
    )
    assert again["code"] == "confirmation_invalid"


def test_a_token_is_only_for_the_batch_it_was_given_for(
    claude: Claude, home: AcceptanceHome
) -> None:
    token = claude.call("tag_items", item_ids=_both(home), tag="av")["preview"][
        "confirmation_token"
    ]
    other = claude.refusal(
        "tag_items", item_ids=[home.hdmi_cable], tag="av", confirmation_token=token
    )
    assert other["code"] == "confirmation_invalid"


def test_category_and_status_in_two_calls(claude: Claude, home: AcceptanceHome) -> None:
    token = claude.call("change_items_category", item_ids=_both(home), category="Cables")[
        "preview"
    ]["confirmation_token"]
    given = claude.call(
        "change_items_category", item_ids=_both(home), category="Cables", confirmation_token=token
    )
    assert [item["category"] for item in given["changed"]["items"]] == ["Cables", "Cables"]
    token = claude.call("change_items_status", item_ids=_both(home), status="in_use")["preview"][
        "confirmation_token"
    ]
    used = claude.call(
        "change_items_status", item_ids=_both(home), status="in_use", confirmation_token=token
    )
    assert [item["status"] for item in used["changed"]["items"]] == ["in_use", "in_use"]
    claude.call("undo_history_entry", entry_id=used["changed"]["history_entry_id"])
    assert claude.call("get_item", item_id=home.hdmi_cable)["status"] == "in_place"


def test_a_refused_batch_is_refused_before_any_token(claude: Claude, home: AcceptanceHome) -> None:
    there = claude.refusal("move_items", item_ids=_both(home), location_id="B-014")
    assert there["code"] == "already_there"
    lent = claude.refusal("change_items_status", item_ids=_both(home), status="lent_out")
    assert lent["code"] == "validation_failed"


def test_lend_and_delete_in_two_calls(claude: Claude, home: AcceptanceHome) -> None:
    token = claude.call("lend_items", item_ids=_both(home), lent_to="Dana")["preview"][
        "confirmation_token"
    ]
    lent = claude.call("lend_items", item_ids=_both(home), lent_to="Dana", confirmation_token=token)
    assert [item["lent_to"] for item in lent["changed"]["items"]] == ["Dana", "Dana"]
    asked = claude.call("delete_items", item_ids=_both(home))
    assert claude.call("get_item", item_id=home.hdmi_cable)["deleted_at"] is None
    token = asked["preview"]["confirmation_token"]
    deleted = claude.call("delete_items", item_ids=_both(home), confirmation_token=token)
    assert claude.call("get_item", item_id=home.hdmi_cable)["deleted_at"] is not None
    claude.call("undo_history_entry", entry_id=deleted["changed"]["history_entry_id"])
    assert claude.call("get_item", item_id=home.hdmi_cable)["status"] == "lent_out"
