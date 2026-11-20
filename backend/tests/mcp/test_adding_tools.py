from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request
from tests.photos import photo


def test_several_items_go_into_a_bin_by_its_code_as_one_change(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    added = claude.call(
        "add_items", names=["Ethernet cable", "Patch cable"], home_location_id=home.cables
    )
    assert [item["home_location_id"] for item in added["items"]] == [home.cables, home.cables]
    history = signed_in.get("/api/history", params={"item_id": added["items"][0]["id"]}).json()
    assert [(entry["actor"], entry["action"]) for entry in history["items"]] == [
        ("mcp", "items.created")
    ]


def test_an_uploaded_photo_adds_a_nameless_item_to_the_inbox(
    claude: Claude, home: AcceptanceHome
) -> None:
    added = claude.call(
        "add_item_by_photo", upload_id=claude.upload(photo("PNG")), home_location_id=home.cables
    )
    assert (added["name"], added["home_location_id"]) == (None, home.cables)
    inbox = claude.call("list_inbox")
    assert [item["id"] for item in inbox["items"]] == [added["id"]]
    assert claude.call("count_inbox") == {"count": 1}


def test_claude_can_look_at_a_photo_and_name_the_item(claude: Claude, home: AcceptanceHome) -> None:
    added = claude.call(
        "add_item_by_photo", upload_id=claude.upload(photo("PNG")), home_location_id=home.cables
    )
    attachment_id = added["photo_url"].split("/")[3]
    params = {"name": "get_attachment_file", "arguments": {"attachment_id": attachment_id}}
    response = mcp_request(claude.client, claude.secret, "tools/call", params)
    content = response.json()["result"]["content"][0]
    assert (content["type"], content["mimeType"]) == ("image", "image/jpeg")
    named = claude.call("update_item", item_id=added["id"], changes={"name": "Multimeter"})
    assert named["name"] == "Multimeter"
    assert claude.call("count_inbox") == {"count": 0}


def test_photo_refusals_carry_the_api_s_codes(claude: Claude) -> None:
    not_a_photo = claude.upload(b"shopping list")
    assert claude.refusal("add_item_by_photo", upload_id=not_a_photo)["code"] == (
        "unsupported_photo"
    )
    assert claude.refusal("add_item_by_photo", upload_id="nothing")["code"] == ("upload_not_found")
    assert claude.refusal("get_attachment_file", attachment_id="nothing")["code"] == (
        "attachment_not_found"
    )


def test_claude_undoes_its_own_mistake_as_mcp(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    added = claude.call("create_item", name="Ethernet cabel", home_location_id=home.cables)
    undone = claude.call("undo_history_entry", entry_id=added["history_entry_id"])
    assert undone["undone_entry_id"] == added["history_entry_id"]
    assert signed_in.get(f"/api/items/{added['id']}").status_code == 404
    again = claude.refusal("undo_history_entry", entry_id=added["history_entry_id"])
    assert again["code"] == "already_undone"
