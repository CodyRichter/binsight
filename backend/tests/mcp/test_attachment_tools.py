import base64
from typing import Any

from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request
from tests.photos import PDF, photo


def _content(claude: Claude, attachment_id: str) -> dict[str, Any]:
    params = {"name": "get_attachment_file", "arguments": {"attachment_id": attachment_id}}
    response = mcp_request(claude.client, claude.secret, "tools/call", params)
    content: dict[str, Any] = response.json()["result"]["content"][0]
    return content


def test_claude_attaches_a_receipt_and_reads_it_back(claude: Claude, home: AcceptanceHome) -> None:
    attached = claude.call(
        "attach_file", item_id=home.hdmi_cable, upload_id=claude.upload(PDF), filename="Receipt.pdf"
    )
    assert attached["filename"] == "Receipt.pdf"
    content = _content(claude, attached["id"])
    assert content["type"] == "resource"
    assert content["resource"]["mimeType"] == "application/pdf"
    assert base64.b64decode(content["resource"]["blob"]) == PDF
    listed = claude.call("list_item_attachments", item_id=home.hdmi_cable)
    assert [each["kind"] for each in listed["items"]] == ["file"]


def test_claude_adds_a_photo_and_sees_it_as_an_image(claude: Claude, home: AcceptanceHome) -> None:
    added = claude.call("add_item_photo", item_id=home.hdmi_cable, upload_id=claude.upload(photo()))
    assert _content(claude, added["id"])["mimeType"] == "image/jpeg"


def test_one_upload_puts_the_same_photo_on_several_items(
    claude: Claude, home: AcceptanceHome
) -> None:
    upload_id = claude.upload(photo())
    first = claude.call("add_item_photo", item_id=home.hdmi_cable, upload_id=upload_id)
    second = claude.call("add_item_photo", item_id=home.usb_c_charger, upload_id=upload_id)
    assert first["id"] != second["id"]
    assert _content(claude, second["id"])["mimeType"] == "image/jpeg"


def test_removing_an_attachment_asks_first(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    link = claude.call("attach_web_link", item_id=home.hdmi_cable, url="https://example.com")
    inputs = {"item_id": home.hdmi_cable, "attachment_id": link["id"]}
    asked = claude.call("remove_item_attachment", **inputs)
    assert asked["preview"]["attachment"]["url"] == "https://example.com"
    listed = signed_in.get(f"/api/items/{home.hdmi_cable}/attachments").json()["items"]
    assert len(listed) == 1
    token = asked["preview"]["confirmation_token"]
    removed = claude.call("remove_item_attachment", **inputs, confirmation_token=token)
    assert removed["removed"]["history_entry_id"]
    assert signed_in.get(f"/api/items/{home.hdmi_cable}/attachments").json()["items"] == []


def test_claude_sets_a_bin_s_photo_by_its_code_and_removes_it_after_asking(
    claude: Claude, home: AcceptanceHome
) -> None:
    changed = claude.call(
        "set_location_photo", location_id=home.cables, upload_id=claude.upload(photo())
    )
    assert (changed["id"], changed["photo_url"] is not None) == (home.cables, True)
    asked = claude.call("remove_location_photo", location_id=home.cables)
    token = asked["preview"]["confirmation_token"]
    removed = claude.call(
        "remove_location_photo", location_id=home.cables, confirmation_token=token
    )
    assert removed["removed"]["photo_url"] is None


def test_an_upload_that_is_not_a_pdf_or_image_is_refused(
    claude: Claude, home: AcceptanceHome
) -> None:
    refused = claude.refusal(
        "attach_file", item_id=home.hdmi_cable, upload_id=claude.upload(b"notes"), filename="x"
    )
    assert refused["code"] == "unsupported_file"


def test_an_upload_nothing_was_sent_to_is_refused(claude: Claude, home: AcceptanceHome) -> None:
    upload_id = claude.call("create_upload")["upload_id"]
    refused = claude.refusal("add_item_photo", item_id=home.hdmi_cable, upload_id=upload_id)
    assert refused["code"] == "upload_not_sent"
