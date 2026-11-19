import base64
import json

from app.features.labels.label_image import draw_label
from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request

PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def _typed(code: str) -> str:
    return code.lower().replace("-", "")


def test_what_is_in_cables_gives_both_items_and_the_bin_s_path(
    claude: Claude, home: AcceptanceHome
) -> None:
    page = claude.call("list_items", location_id=home.cables)
    assert [item["name"] for item in page["items"]] == ["HDMI cable", "USB-C charger"]
    assert [step["name"] for step in page["items"][0]["path"]] == PATH_TO_CABLES
    assert claude.call("get_location", location_id=_typed(home.cables))["id"] == home.cables


def test_adding_by_a_typed_code_puts_the_item_in_cables(
    claude: Claude, home: AcceptanceHome
) -> None:
    created = claude.call(
        "create_item", name="Ethernet cable", home_location_id=_typed(home.cables)
    )
    assert created["home_location_id"] == home.cables


def test_a_location_inside_tools_can_be_named_by_its_code(
    claude: Claude, home: AcceptanceHome
) -> None:
    drawer = claude.call("create_location", name="Bits", type="box", parent_id=_typed(home.tools))
    assert drawer["parent_id"] == home.tools


def test_the_label_image_is_given_as_a_png(claude: Claude, home: AcceptanceHome) -> None:
    params = {"name": "get_label_image", "arguments": {"code": _typed(home.cables)}}
    result = mcp_request(claude.client, claude.secret, "tools/call", params).json()["result"]
    assert not result["isError"]
    [image] = result["content"]
    assert (image["type"], image["mimeType"]) == ("image", "image/png")
    expected = draw_label(home.cables, f"http://binsight.test/l/{home.cables}")
    assert base64.b64decode(image["data"]) == expected


def test_an_unknown_label_image_is_refused_with_the_api_s_code(claude: Claude) -> None:
    params = {"name": "get_label_image", "arguments": {"code": "ZZZ-999"}}
    result = mcp_request(claude.client, claude.secret, "tools/call", params).json()["result"]
    assert result["isError"]
    assert json.loads(result["content"][0]["text"])["error"]["code"] == "location_not_found"
