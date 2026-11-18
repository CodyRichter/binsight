from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core import clock
from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude


def _cables_names(client: TestClient, home: AcceptanceHome) -> list[str]:
    listed = client.get("/api/items", params={"location_id": home.cables}).json()
    return [item["name"] for item in listed["items"]]


def test_asking_to_delete_previews_and_deletes_nothing(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    asked = claude.call("delete_item", item_id=home.hdmi_cable)
    assert asked["preview"]["item"]["name"] == "HDMI cable"
    assert [step["name"] for step in asked["preview"]["item"]["path"]] == [
        "Home",
        "Garage",
        "Shelf 2",
        "Cables",
    ]
    assert asked["preview"]["confirmation_token"]
    assert asked["deleted"] is None
    assert _cables_names(signed_in, home) == ["HDMI cable", "USB-C charger"]


def test_the_token_deletes_the_item_once(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    token = claude.call("delete_item", item_id=home.hdmi_cable)["preview"]["confirmation_token"]
    deleted = claude.call("delete_item", item_id=home.hdmi_cable, confirmation_token=token)
    assert deleted["deleted"]["deleted_at"] is not None
    assert _cables_names(signed_in, home) == ["USB-C charger"]
    history = signed_in.get("/api/history", params={"item_id": home.hdmi_cable}).json()
    assert (history["items"][0]["action"], history["items"][0]["actor"]) == ("item.deleted", "mcp")
    claude.call("restore_item", item_id=home.hdmi_cable)
    reused = claude.refusal("delete_item", item_id=home.hdmi_cable, confirmation_token=token)
    assert reused["code"] == "confirmation_invalid"


def test_a_token_works_only_for_the_item_it_was_given_for(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    token = claude.call("delete_item", item_id=home.hdmi_cable)["preview"]["confirmation_token"]
    other = claude.refusal("delete_item", item_id=home.usb_c_charger, confirmation_token=token)
    assert other["code"] == "confirmation_invalid"
    guessed = token[::-1]
    made_up = claude.refusal("delete_item", item_id=home.hdmi_cable, confirmation_token=guessed)
    assert made_up["code"] == "confirmation_invalid"
    assert _cables_names(signed_in, home) == ["HDMI cable", "USB-C charger"]


def test_a_token_expires_after_ten_minutes(
    claude: Claude, home: AcceptanceHome, monkeypatch: pytest.MonkeyPatch
) -> None:
    token = claude.call("delete_item", item_id=home.hdmi_cable)["preview"]["confirmation_token"]
    later = clock.now() + timedelta(minutes=10, seconds=1)

    def ten_minutes_on() -> datetime:
        return later

    monkeypatch.setattr(clock, "now", ten_minutes_on)
    expired = claude.refusal("delete_item", item_id=home.hdmi_cable, confirmation_token=token)
    assert expired["code"] == "confirmation_expired"


def test_restoring_brings_the_item_back_as_the_api_shows_it(
    claude: Claude, signed_in: TestClient, home: AcceptanceHome
) -> None:
    token = claude.call("delete_item", item_id=home.usb_c_charger)["preview"]["confirmation_token"]
    claude.call("delete_item", item_id=home.usb_c_charger, confirmation_token=token)
    restored = claude.call("restore_item", item_id=home.usb_c_charger)
    through_api = signed_in.get(f"/api/items/{home.usb_c_charger}").json()
    assert {**through_api, "history_entry_id": restored["history_entry_id"]} == restored
    assert claude.refusal("restore_item", item_id=home.usb_c_charger)["code"] == "not_deleted"


def test_a_deleted_item_cannot_be_asked_about_again(claude: Claude, home: AcceptanceHome) -> None:
    token = claude.call("delete_item", item_id=home.hdmi_cable)["preview"]["confirmation_token"]
    claude.call("delete_item", item_id=home.hdmi_cable, confirmation_token=token)
    assert claude.refusal("delete_item", item_id=home.hdmi_cable)["code"] == "item_deleted"
