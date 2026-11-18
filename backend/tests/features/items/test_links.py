from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service as history
from app.features.items import service
from app.features.items.schemas import ItemLinkNew
from app.models import Actor, LinkKind
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _link(engine: Engine, item_id: str, other_item_id: str, kind: LinkKind) -> tuple[str, str]:
    with open_write_session(engine) as session:
        linked = service.link_items(
            session, item_id, ItemLinkNew(other_item_id=other_item_id, kind=kind), Actor.app, LATER
        )
    return linked.link_id, linked.history_entry_id


def _new_item(engine: Engine, name: str, location_id: str) -> str:
    with open_write_session(engine) as session:
        return builders.item(session, name, location_id, LATER).id


def _linked(engine: Engine, item_id: str) -> list[tuple[str, str | None]]:
    with open_read_session(engine) as session:
        page = service.list_item_links(session, item_id, 50, None)
    return [(each.kind, each.item.name) for each in page.items]


def _undo(engine: Engine, settings: Settings, entry_id: str, minutes: int = 60) -> None:
    with open_write_session(engine) as session:
        history.undo(session, settings, entry_id, Actor.app, LATER + timedelta(minutes=minutes))


def test_each_side_of_a_link_reads_from_its_own_item(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    drill = _new_item(migrated_engine, "Drill", home.tools)
    kit = _new_item(migrated_engine, "Drill kit", home.tools)
    _link(migrated_engine, home.usb_c_charger, drill, LinkKind.belongs_with)
    _link(migrated_engine, drill, kit, LinkKind.part_of)
    assert _linked(migrated_engine, drill) == [
        ("belongs_with", "USB-C charger"),
        ("part_of", "Drill kit"),
    ]
    assert _linked(migrated_engine, kit) == [("part", "Drill")]
    assert _linked(migrated_engine, home.usb_c_charger) == [("belongs_with", "Drill")]


def _refusal(engine: Engine, item_id: str, other_item_id: str, kind: LinkKind) -> str:
    with pytest.raises(AppError) as refused:
        _link(engine, item_id, other_item_id, kind)
    return refused.value.code


def test_links_that_make_no_sense_are_refused(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    hdmi, charger = home.hdmi_cable, home.usb_c_charger
    kit = _new_item(migrated_engine, "Cable kit", home.cables)
    _link(migrated_engine, hdmi, charger, LinkKind.belongs_with)
    assert _refusal(migrated_engine, hdmi, hdmi, LinkKind.belongs_with) == "same_item"
    assert _refusal(migrated_engine, charger, hdmi, LinkKind.belongs_with) == "already_linked"
    _link(migrated_engine, hdmi, kit, LinkKind.part_of)
    _link(migrated_engine, kit, charger, LinkKind.part_of)
    assert _refusal(migrated_engine, charger, hdmi, LinkKind.part_of) == "part_cycle"
    assert _refusal(migrated_engine, hdmi, "nothing", LinkKind.part_of) == "item_not_found"


def test_a_removed_link_comes_back_with_undo_unless_made_again(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    hdmi, charger = home.hdmi_cable, home.usb_c_charger
    link_id, _ = _link(migrated_engine, hdmi, charger, LinkKind.belongs_with)
    with open_write_session(migrated_engine) as session:
        removed = service.unlink_items(session, link_id, Actor.app, LATER)
    assert _linked(migrated_engine, hdmi) == []
    _undo(migrated_engine, settings, removed.history_entry_id)
    assert _linked(migrated_engine, hdmi) == [("belongs_with", "USB-C charger")]
    with open_write_session(migrated_engine) as session:
        again = service.unlink_items(session, link_id, Actor.app, LATER + timedelta(hours=2))
    _link(migrated_engine, charger, hdmi, LinkKind.belongs_with)
    with pytest.raises(AppError) as refused:
        _undo(migrated_engine, settings, again.history_entry_id, minutes=180)
    assert refused.value.code == "changed_since"


def test_undoing_a_link_removes_it(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _, entry_id = _link(migrated_engine, home.hdmi_cable, home.usb_c_charger, LinkKind.part_of)
    _undo(migrated_engine, settings, entry_id)
    assert _linked(migrated_engine, home.usb_c_charger) == []


def _latest_entry(engine: Engine, item_id: str) -> tuple[str, str]:
    with open_read_session(engine) as session:
        latest = history.list_item_history(session, item_id, 1, None).items[0]
    return latest.id, latest.action


def test_both_items_history_shows_the_link(migrated_engine: Engine, home: AcceptanceHome) -> None:
    link_id, entry_id = _link(
        migrated_engine, home.hdmi_cable, home.usb_c_charger, LinkKind.part_of
    )
    for item_id in (home.hdmi_cable, home.usb_c_charger):
        assert _latest_entry(migrated_engine, item_id) == (entry_id, "item.linked")
    with open_write_session(migrated_engine) as session:
        removed = service.unlink_items(session, link_id, Actor.app, LATER + timedelta(minutes=1))
    for item_id in (home.hdmi_cable, home.usb_c_charger):
        assert _latest_entry(migrated_engine, item_id) == (
            removed.history_entry_id,
            "item.unlinked",
        )


def test_a_deleted_item_is_left_out_of_links_and_keeps_its_own(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _link(migrated_engine, home.hdmi_cable, home.usb_c_charger, LinkKind.belongs_with)
    with open_write_session(migrated_engine) as session:
        service.delete_item(session, home.usb_c_charger, Actor.app, LATER)
    assert _linked(migrated_engine, home.hdmi_cable) == []
    assert _linked(migrated_engine, home.usb_c_charger) == [("belongs_with", "HDMI cable")]


def test_linking_through_the_api(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    drill = signed_in.post("/api/items", json={"name": "Drill", "home_location_id": site})
    charger = signed_in.post("/api/items", json={"name": "Charger", "home_location_id": site})
    drill_id, charger_id = drill.json()["id"], charger.json()["id"]
    made = signed_in.post(
        f"/api/items/{charger_id}/links", json={"other_item_id": drill_id, "kind": "belongs_with"}
    )
    assert made.status_code == 201
    listed = signed_in.get(f"/api/items/{drill_id}/links").json()["items"]
    assert [(each["kind"], each["item"]["name"]) for each in listed] == [
        ("belongs_with", "Charger")
    ]
    removed = signed_in.delete(f"/api/item-links/{made.json()['link_id']}")
    assert removed.status_code == 200
    assert signed_in.get(f"/api/items/{drill_id}/links").json()["items"] == []
