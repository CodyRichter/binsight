import base64

from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request
from tests.photos import photo


def _photo_base64() -> str:
    return base64.b64encode(photo("PNG")).decode()


def test_several_items_go_into_a_bin_by_its_code_as_one_change(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    added = claude.call(
        "add_items", names=["Ethernet cable", "Patch cable"], home_location_id="B-014"
    )
    assert [item["home_location_id"] for item in added["items"]] == [home.cables, home.cables]
    history = signed_in.get("/api/history", params={"item_id": added["items"][0]["id"]}).json()
    assert [(entry["actor"], entry["action"]) for entry in history["items"]] == [
        ("mcp", "items.created")
    ]


def test_a_photo_sent_as_base64_adds_a_nameless_item_to_the_inbox(
    claude: Claude, home: AcceptanceHome
) -> None:
    added = claude.call("add_item_by_photo", photo_base64=_photo_base64(), home_location_id="B-014")
    assert (added["name"], added["home_location_id"]) == (None, home.cables)
    inbox = claude.call("list_inbox")
    assert [item["id"] for item in inbox["items"]] == [added["id"]]
    assert claude.call("count_inbox") == {"count": 1}


def test_claude_can_look_at_a_photo_and_name_the_item(claude: Claude, home: AcceptanceHome) -> None:
    added = claude.call(
        "add_item_by_photo", photo_base64=_photo_base64(), home_location_id=home.cables
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
    not_base64 = claude.refusal("add_item_by_photo", photo_base64="not base64!")
    assert not_base64["code"] == "unsupported_photo"
    not_a_photo = base64.b64encode(b"shopping list").decode()
    assert claude.refusal("add_item_by_photo", photo_base64=not_a_photo)["code"] == (
        "unsupported_photo"
    )
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
