from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service as history
from app.features.items import service
from app.features.items.schemas import Item, ItemChanges
from app.models import Actor, HistoryEntry
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _change(engine: Engine, item_id: str, changes: dict[str, object], minute: int = 0) -> str:
    with open_write_session(engine) as session:
        updated = service.update_item(
            session,
            item_id,
            ItemChanges.model_validate(changes),
            Actor.app,
            LATER + timedelta(minutes=minute),
        )
    return updated.history_entry_id


def _item(engine: Engine, item_id: str) -> Item:
    with open_read_session(engine) as session:
        return service.get_item(session, item_id)


def _undo(engine: Engine, settings: Settings, entry_id: str) -> None:
    with open_write_session(engine) as session:
        history.undo(session, settings, entry_id, Actor.app, LATER + timedelta(hours=1))


DETAILS: dict[str, object] = {
    "notes": "The short one is in the car.",
    "brand": "Anker",
    "model": "A8742",
    "serial_number": "SN-0042",
    "purchase_date": "2025-03-01",
    "price_cents": 1299,
    "order_link": "https://example.com/order/42",
    "warranty_ends": "2027-03-01",
    "return_ends": "2025-04-01",
}


def test_every_detail_is_set_and_then_cleared(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    entry_id = _change(migrated_engine, home.hdmi_cable, DETAILS)
    item = _item(migrated_engine, home.hdmi_cable)
    assert item.model_dump(mode="json", include=set(DETAILS)) == DETAILS
    with open_read_session(migrated_engine) as session:
        entry = session.get(HistoryEntry, entry_id)
        assert entry is not None
        assert entry.action == "item.updated"
        assert entry.changes[0].after["purchase_date"] == "2025-03-01"
    _change(migrated_engine, home.hdmi_cable, dict.fromkeys(DETAILS), minute=1)
    cleared = _item(migrated_engine, home.hdmi_cable)
    assert cleared.model_dump(include=set(DETAILS)) == dict.fromkeys(DETAILS)
    assert (cleared.name, cleared.quantity) == ("HDMI cable", 3)


def test_a_category_is_made_by_name_and_reused_ignoring_case(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _change(migrated_engine, home.hdmi_cable, {"category": "Cables"})
    _change(migrated_engine, home.usb_c_charger, {"category": "cables"}, minute=1)
    assert _item(migrated_engine, home.usb_c_charger).category == "Cables"
    with open_read_session(migrated_engine) as session:
        listed = service.list_categories(session, 50, None)
    assert [(each.name, each.item_count) for each in listed.items] == [("Cables", 2)]


def test_tags_are_lower_cased_and_kept_once(migrated_engine: Engine, home: AcceptanceHome) -> None:
    _change(migrated_engine, home.hdmi_cable, {"tags": ["USB-C", " hdmi ", "usb-c"]})
    assert _item(migrated_engine, home.hdmi_cable).tags == ["hdmi", "usb-c"]
    _change(migrated_engine, home.hdmi_cable, {"tags": ["hdmi"]}, minute=1)
    assert _item(migrated_engine, home.hdmi_cable).tags == ["hdmi"]


@pytest.mark.parametrize(
    "changes",
    [
        {"order_link": "ftp://example.com"},
        {"price_cents": -1},
        {"tags": None},
        {"name": None},
        {},
    ],
)
def test_changes_the_api_cannot_make_are_refused(changes: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ItemChanges.model_validate(changes)


def test_one_undo_puts_back_a_date_a_category_and_tags(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _change(migrated_engine, home.hdmi_cable, {"warranty_ends": "2027-01-01", "tags": ["old"]})
    entry_id = _change(
        migrated_engine,
        home.hdmi_cable,
        {"warranty_ends": "2028-06-30", "category": "Cables", "tags": ["hdmi", "4k"]},
        minute=1,
    )
    _undo(migrated_engine, settings, entry_id)
    item = _item(migrated_engine, home.hdmi_cable)
    assert (item.warranty_ends, item.category, item.tags) == (date(2027, 1, 1), None, ["old"])


def test_undo_is_refused_once_the_tags_have_changed_since(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    entry_id = _change(migrated_engine, home.hdmi_cable, {"tags": ["hdmi"]})
    _change(migrated_engine, home.hdmi_cable, {"tags": ["hdmi", "4k"]}, minute=1)
    with pytest.raises(AppError) as refused:
        _undo(migrated_engine, settings, entry_id)
    assert refused.value.code == "changed_since"


def test_unused_categories_and_deleted_items_tags_are_not_listed(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _change(migrated_engine, home.hdmi_cable, {"category": "Cabels", "tags": ["hdmi"]})
    _change(migrated_engine, home.hdmi_cable, {"category": "Cables"}, minute=1)
    _change(migrated_engine, home.usb_c_charger, {"category": "Chargers", "tags": ["usb-c"]})
    with open_write_session(migrated_engine) as session:
        service.delete_item(session, home.usb_c_charger, Actor.app, LATER + timedelta(minutes=2))
    with open_read_session(migrated_engine) as session:
        categories = service.list_categories(session, 50, None)
        tags = service.list_tags(session, 50, None)
    assert [each.name for each in categories.items] == ["Cables"]
    assert [(each.name, each.item_count) for each in tags.items] == [("hdmi", 1)]


def test_details_change_through_the_api(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    created = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": site})
    item_id = created.json()["id"]
    response = signed_in.patch(
        f"/api/items/{item_id}",
        json={"serial_number": "DR-123", "category": "Tools", "tags": ["18v"]},
    )
    assert response.status_code == 200
    assert response.json()["serial_number"] == "DR-123"
    assert signed_in.get("/api/categories").json()["items"] == [{"name": "Tools", "item_count": 1}]
    assert signed_in.get("/api/tags").json() == {
        "items": [{"name": "18v", "item_count": 1}],
        "next_cursor": None,
    }
