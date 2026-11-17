import base64
import json
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_read_session
from app.features.labels.label_image import draw_label
from app.models import Actor, HistoryEntry
from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request

PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def test_what_is_in_b_014_gives_both_items_and_the_bin_s_path(
    claude: Claude, home: AcceptanceHome
) -> None:
    page = claude.call("list_items", location_id="B-014")
    assert [item["name"] for item in page["items"]] == ["HDMI cable", "USB-C charger"]
    assert [step["name"] for step in page["items"][0]["path"]] == PATH_TO_CABLES
    cables = claude.call("get_location", location_id="b14")
    assert (cables["id"], cables["label_code"]) == (home.cables, "B-014")


def test_adding_to_b_014_puts_the_item_in_cables(claude: Claude, home: AcceptanceHome) -> None:
    created = claude.call("create_item", name="Ethernet cable", home_location_id="B-014")
    assert created["home_location_id"] == home.cables


def test_a_location_inside_b_015_can_be_named_by_its_code(
    claude: Claude, home: AcceptanceHome
) -> None:
    drawer = claude.call("create_location", name="Bits", type="box", parent_id="B-015")
    assert drawer["parent_id"] == home.tools


def test_labels_made_and_claimed_through_mcp_match_the_api_and_are_recorded_as_mcp(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    made = claude.call("create_blank_labels", count=2)
    assert [label["code"] for label in made["labels"]] == ["B-016", "B-017"]
    claimed = claude.call("claim_label", code="B-016", location_id=home.shelf)
    assert claimed["location_id"] == home.shelf
    assert claude.call("get_label", code="b16") == signed_in.get("/api/labels/B-016").json()
    assert (
        claude.call("list_labels", limit=1)
        == signed_in.get("/api/labels", params={"limit": 1}).json()
    )
    app = cast(FastAPI, signed_in.app)
    with open_read_session(app.state.engine) as session:
        for entry_id in (made["history_entry_id"], claimed["history_entry_id"]):
            entry = session.get(HistoryEntry, entry_id)
            assert entry is not None
            assert entry.actor == Actor.mcp


def test_a_label_in_use_is_refused_with_the_api_s_code(
    claude: Claude, home: AcceptanceHome
) -> None:
    refusal = claude.refusal("claim_label", code="B-014", location_id=home.tools)
    assert refusal["code"] == "label_already_claimed"


@pytest.mark.usefixtures("home")
def test_the_label_image_is_given_as_a_png(claude: Claude) -> None:
    params = {"name": "get_label_image", "arguments": {"code": "b14"}}
    result = mcp_request(claude.client, claude.secret, "tools/call", params).json()["result"]
    assert not result["isError"]
    [image] = result["content"]
    assert (image["type"], image["mimeType"]) == ("image", "image/png")
    expected = draw_label("B-014", "http://binsight.test/l/B-014")
    assert base64.b64decode(image["data"]) == expected


def test_an_unknown_label_image_is_refused_with_the_api_s_code(claude: Claude) -> None:
    params = {"name": "get_label_image", "arguments": {"code": "B-404"}}
    result = mcp_request(claude.client, claude.secret, "tools/call", params).json()["result"]
    assert result["isError"]
    assert json.loads(result["content"][0]["text"])["error"]["code"] == "label_not_found"
