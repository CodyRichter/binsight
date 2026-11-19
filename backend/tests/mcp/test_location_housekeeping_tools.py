import pytest
from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def _deleted_at(client: TestClient, location_id: str) -> object:
    return client.get(f"/api/locations/{location_id}").json()["deleted_at"]


def test_deleting_a_location_by_code_previews_then_deletes_with_the_token(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("delete_location", location_id="B-014", move_contents_to="B-015")
    preview = asked["preview"]
    assert (preview["location"]["name"], preview["destination"]["name"]) == ("Cables", "Tools")
    assert (preview["items_moving"], preview["locations_moving"]) == (2, 0)
    assert _deleted_at(signed_in, home.cables) is None
    other = claude.refusal(
        "delete_location",
        location_id="B-014",
        move_contents_to=home.garage,
        confirmation_token=preview["confirmation_token"],
    )
    assert other["code"] == "confirmation_invalid"
    token = claude.call("delete_location", location_id="B-014", move_contents_to="B-015")[
        "preview"
    ]["confirmation_token"]
    deleted = claude.call(
        "delete_location", location_id="B-014", move_contents_to="B-015", confirmation_token=token
    )
    assert deleted["deleted"]["deleted_at"] is not None
    assert signed_in.get(f"/api/locations/{home.tools}").json()["direct_item_count"] == 2


@pytest.mark.usefixtures("home")
def test_a_location_with_contents_is_refused_before_any_token(claude: Claude) -> None:
    assert claude.refusal("delete_location", location_id="B-014")["code"] == "location_has_contents"


def test_merging_previews_then_merges_and_restoring_needs_no_token(
    claude: Claude, home: AcceptanceHome
) -> None:
    token = claude.call("merge_location", location_id=home.tools, into=home.cables)["preview"][
        "confirmation_token"
    ]
    merged = claude.call(
        "merge_location", location_id=home.tools, into=home.cables, confirmation_token=token
    )
    assert merged["merged"]["id"] == home.cables
    restored = claude.call("restore_location", location_id="B-015")
    assert (restored["id"], restored["deleted_at"]) == (home.tools, None)


def test_renaming_clearing_a_summary_and_reordering(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    claude.call("update_location", location_id="B-014", changes={"summary": "spare network cables"})
    renamed = claude.call(
        "update_location", location_id="B-014", changes={"name": "Wires", "summary": None}
    )
    assert (renamed["name"], renamed["summary"]) == ("Wires", None)
    claude.call("reorder_location", location_id=home.tools, position=0)
    shelf = [
        row["name"]
        for row in signed_in.get("/api/locations").json()["locations"]
        if row["parent_id"] == home.shelf
    ]
    assert shelf == ["Tools", "Wires"]


def test_changing_a_bin_s_type_and_icon(claude: Claude, home: AcceptanceHome) -> None:
    changed = claude.call(
        "update_location", location_id="B-014", changes={"type": "drawer", "icon": "plug"}
    )
    assert (changed["id"], changed["type"], changed["icon"]) == (home.cables, "drawer", "plug")
    refused = claude.refusal("update_location", location_id=home.home, changes={"type": "box"})
    assert refused["code"] == "site_type"
