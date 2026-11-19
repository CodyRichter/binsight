import base64
import json
import zipfile
from io import BytesIO

from fastapi.testclient import TestClient

from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude, mcp_request


def _csv(home: AcceptanceHome) -> str:
    return f"name,location\nDrill,Shed > Bench\nSaw,{home.tools}\n"


def test_claude_exports_everything_as_a_zip(claude: Claude, home: AcceptanceHome) -> None:
    params = {"name": "export_everything", "arguments": {}}
    result = mcp_request(claude.client, claude.secret, "tools/call", params).json()["result"]
    resource = result["content"][0]["resource"]
    assert resource["mimeType"] == "application/zip"
    archive = zipfile.ZipFile(BytesIO(base64.b64decode(resource["blob"])))
    document = json.loads(archive.read("binsight.json"))
    assert home.hdmi_cable in {row["id"] for row in document["items"]}


def test_importing_asks_first_then_adds_everything(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("import_items", csv_text=_csv(home))
    preview = asked["preview"]
    assert (preview["items_to_create"], preview["locations_to_create"]) == (
        2,
        ["Shed", "Shed > Bench"],
    )
    assert preview["first_item_names"] == ["Drill", "Saw"]
    assert len(signed_in.get("/api/locations").json()["locations"]) == 5
    token = preview["confirmation_token"]
    done = claude.call("import_items", csv_text=_csv(home), confirmation_token=token)["done"]
    assert (done["items_created"], done["locations_created"]) == (2, 2)
    tools = signed_in.get("/api/items", params={"location_id": home.tools}).json()["items"]
    assert [each["name"] for each in tools] == ["Saw"]
    again = claude.refusal("import_items", csv_text=_csv(home), confirmation_token=token)
    assert again["code"] == "confirmation_invalid"


def test_a_token_is_only_good_for_the_text_it_was_issued_for(
    claude: Claude, home: AcceptanceHome
) -> None:
    token = claude.call("import_items", csv_text=_csv(home))["preview"]["confirmation_token"]
    other = claude.refusal(
        "import_items", csv_text=_csv(home) + "Rake,\n", confirmation_token=token
    )
    assert other["code"] == "confirmation_invalid"


def test_bad_rows_are_refused_on_the_first_call(claude: Claude) -> None:
    refused = claude.refusal("import_items", csv_text="name,quantity\nDrill,lots\n")
    assert refused["code"] == "import_rows_invalid"
    assert refused["details"]["rows"][0]["column"] == "quantity"


def test_claude_reads_the_insurance_list_by_location_code(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"price_cents": 500})
    listing = claude.call("get_insurance_list", location_id=home.cables)
    assert (listing["title"], listing["total_cents"], listing["items_without_price"]) == (
        "Cables",
        1500,
        1,
    )
    assert claude.call("get_insurance_list")["item_count"] == 2


def test_claude_reads_a_contents_sheet(claude: Claude, home: AcceptanceHome) -> None:
    sheet = claude.call("get_contents_sheet", location_id=home.shelf)
    groups = [group["location_id"] for group in sheet["groups"]]
    assert groups == [home.shelf, home.cables, home.tools]
