import csv
import json
import zipfile
from dataclasses import replace
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import build_app
from tests.builders import AcceptanceHome
from tests.photos import PDF, photo


def _export(signed_in: TestClient) -> zipfile.ZipFile:
    response = signed_in.get("/api/export")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "binsight-export-" in response.headers["content-disposition"]
    return zipfile.ZipFile(BytesIO(response.content))


def _csv_rows(archive: zipfile.ZipFile, name: str) -> list[dict[str, Any]]:
    return list(csv.DictReader(StringIO(archive.read(name).decode())))


def test_the_export_holds_the_data_as_json_and_csv_with_every_file(
    signed_in: TestClient, home: AcceptanceHome
) -> None:
    files = {"file": ("Receipt.pdf", PDF, "application/pdf")}
    attached = signed_in.post(f"/api/items/{home.hdmi_cable}/files", files=files).json()
    archive = _export(signed_in)
    document = json.loads(archive.read("binsight.json"))
    assert document["format_version"] == 1
    assert len(document["locations"]) == 5
    assert {row["name"] for row in document["items"]} == {"HDMI cable", "USB-C charger"}
    assert len(document["labels"]) == 15
    assert document["history_entries"]
    assert document["history_changes"]
    stored = next(row for row in document["attachments"] if row["id"] == attached["id"])
    assert archive.read(stored["path"]) == PDF
    items = _csv_rows(archive, "items.csv")
    assert {row["location"] for row in items} == {"Home > Garage > Shelf 2 > Cables"}
    places = {row["location"]: row for row in _csv_rows(archive, "locations.csv")}
    assert places["Home > Garage > Shelf 2 > Cables"]["label_code"] == "B-014"


@pytest.mark.usefixtures("home")
def test_an_item_never_named_stays_out_of_the_csv_but_not_the_json(
    signed_in: TestClient,
) -> None:
    files = {"photo": ("thing.jpg", photo(), "image/jpeg")}
    added = signed_in.post("/api/items/add-by-photo", files=files).json()
    archive = _export(signed_in)
    document = json.loads(archive.read("binsight.json"))
    assert added["id"] in {row["id"] for row in document["items"]}
    names = {row["name"] for row in _csv_rows(archive, "items.csv")}
    assert names == {"HDMI cable", "USB-C charger"}


@pytest.mark.usefixtures("home")
def test_the_export_leaves_out_sign_in_secrets(signed_in: TestClient) -> None:
    signed_in.post("/api/auth/mcp-credentials", json={"name": "Claude Code"})
    document = json.loads(_export(signed_in).read("binsight.json"))
    assert not {"owner", "login_sessions", "mcp_credentials", "confirmations"} & document.keys()
    assert "correct horse" not in json.dumps(document)


def test_an_export_s_items_import_back_into_a_new_install(
    signed_in: TestClient, home: AcceptanceHome, settings: Settings, tmp_path: Path
) -> None:
    signed_in.patch(f"/api/items/{home.hdmi_cable}", json={"tags": ["hdmi"], "price_cents": 1250})
    exported = _export(signed_in).read("items.csv")
    elsewhere = replace(settings, data_directory=tmp_path / "elsewhere")
    with TestClient(build_app(elsewhere)) as other:
        other.post("/api/auth/owner", json={"password": "correct horse"})
        files = {"csv": ("items.csv", exported, "text/csv")}
        assert other.post("/api/import", files=files).status_code == 200
        home_id = other.get("/api/locations").json()["locations"][0]["id"]
        params = {"location_id": home_id, "everything_inside": "true"}
        imported = other.get("/api/items", params=params).json()["items"]
    assert sorted(
        (each["name"], each["quantity"], each["tags"], each["price_cents"]) for each in imported
    ) == [("HDMI cable", 3, ["hdmi"], 1250), ("USB-C charger", 1, [], None)]
    assert {" > ".join(step["name"] for step in each["path"]) for each in imported} == {
        "Home > Garage > Shelf 2 > Cables"
    }


def test_the_export_needs_sign_in(client: TestClient) -> None:
    assert client.get("/api/export").status_code == 401
