from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service as history
from app.features.items import service
from app.features.items.schemas import Item, ItemLending, ItemStatusChange
from app.features.locations import service as locations
from app.features.search import service as search
from app.features.search.schemas import ItemResult, Search
from app.models import Actor, ItemStatus
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _lend(engine: Engine, item_id: str, name: str, minute: int = 0) -> str:
    with open_write_session(engine) as session:
        lent = service.lend_item(
            session,
            item_id,
            ItemLending(lent_to=name),
            Actor.app,
            LATER + timedelta(minutes=minute),
        )
    return lent.history_entry_id


def _status(engine: Engine, item_id: str, status: str, minute: int = 0) -> str:
    change = ItemStatusChange.model_validate({"status": status})
    with open_write_session(engine) as session:
        changed = service.change_item_status(
            session, item_id, change, Actor.app, LATER + timedelta(minutes=minute)
        )
    return changed.history_entry_id


def _item(engine: Engine, item_id: str) -> Item:
    with open_read_session(engine) as session:
        return service.get_item(session, item_id)


def _undo(engine: Engine, settings: Settings, entry_id: str) -> None:
    with open_write_session(engine) as session:
        history.undo(session, settings, entry_id, Actor.app, LATER + timedelta(hours=1))


def test_lending_keeps_the_home_and_returning_clears_the_name(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _lend(migrated_engine, home.hdmi_cable, "Sam")
    lent = _item(migrated_engine, home.hdmi_cable)
    assert (lent.status, lent.lent_to, lent.home_location_id) == ("lent_out", "Sam", home.cables)
    assert lent.lent_at == LATER
    _lend(migrated_engine, home.hdmi_cable, "Alex", minute=1)
    assert _item(migrated_engine, home.hdmi_cable).lent_to == "Alex"
    with open_write_session(migrated_engine) as session:
        service.return_item(session, home.hdmi_cable, Actor.app, LATER + timedelta(minutes=2))
    returned = _item(migrated_engine, home.hdmi_cable)
    assert (returned.status, returned.lent_to, returned.lent_at) == ("in_place", None, None)


def test_undoing_a_return_lends_it_to_the_same_person_again(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    _lend(migrated_engine, home.hdmi_cable, "Sam")
    with open_write_session(migrated_engine) as session:
        returned = service.return_item(session, home.hdmi_cable, Actor.app, LATER)
    _undo(migrated_engine, settings, returned.history_entry_id)
    item = _item(migrated_engine, home.hdmi_cable)
    assert (item.status, item.lent_to, item.lent_at) == ("lent_out", "Sam", LATER)


def test_marking_a_lent_item_missing_forgets_who_had_it(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _lend(migrated_engine, home.hdmi_cable, "Sam")
    with open_write_session(migrated_engine) as session:
        service.mark_item_missing(session, home.hdmi_cable, Actor.app, LATER)
    item = _item(migrated_engine, home.hdmi_cable)
    assert (item.status, item.lent_to) == ("missing", None)


def test_a_sold_item_leaves_its_location_but_is_still_found(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _status(migrated_engine, home.hdmi_cable, "sold")
    with open_read_session(migrated_engine) as session:
        listed = service.list_items(session, home.cables, False, 50, None).items
        cables = locations.get_location(session, home.cables)
        found = search.search_home(
            session, Search(query="hdmi"), date(2026, 11, 16), 50, None
        ).results
    sold = _item(migrated_engine, home.hdmi_cable)
    assert (sold.status, sold.retired_at, sold.home_location_id) == ("sold", LATER, home.cables)
    assert [each.name for each in listed] == ["USB-C charger"]
    assert cables.direct_item_count == 1
    assert isinstance(found[0], ItemResult)
    assert found[0].item.status == ItemStatus.sold


def test_an_archived_item_leaves_the_inbox(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        loose = builders.item(session, "Old phone", None, LATER)
    _status(migrated_engine, loose.id, "thrown_away")
    with open_read_session(migrated_engine) as session:
        assert service.list_inbox(session, 50, None).items == []
        assert service.count_inbox(session).count == 0


def test_back_in_place_from_the_archive_clears_the_retired_date(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _status(migrated_engine, home.hdmi_cable, "given_away")
    _status(migrated_engine, home.hdmi_cable, "sold", minute=5)
    assert _item(migrated_engine, home.hdmi_cable).retired_at == LATER
    _status(migrated_engine, home.hdmi_cable, "in_place", minute=6)
    back = _item(migrated_engine, home.hdmi_cable)
    assert (back.status, back.retired_at) == ("in_place", None)


def test_undoing_a_retire_brings_it_back_into_its_location(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    entry_id = _status(migrated_engine, home.hdmi_cable, "thrown_away")
    _undo(migrated_engine, settings, entry_id)
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home.cables).direct_item_count == 2
    assert _item(migrated_engine, home.hdmi_cable).retired_at is None


def _attempt(session: Session, item_id: str, action: str) -> None:
    if action == "lend":
        service.lend_item(session, item_id, ItemLending(lent_to="Sam"), Actor.app, LATER)
    elif action == "return":
        service.return_item(session, item_id, Actor.app, LATER)
    elif action == "missing":
        service.mark_item_missing(session, item_id, Actor.app, LATER)
    else:
        change = ItemStatusChange.model_validate({"status": action})
        service.change_item_status(session, item_id, change, Actor.app, LATER)


def _refused(engine: Engine, home: AcceptanceHome, action: str) -> str:
    with pytest.raises(AppError) as refused, open_write_session(engine) as session:
        _attempt(session, home.hdmi_cable, action)
    return refused.value.code


def test_changes_that_make_no_sense_are_refused(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    assert _refused(migrated_engine, home, "in_place") == "status_unchanged"
    assert _refused(migrated_engine, home, "return") == "not_lent"
    _status(migrated_engine, home.hdmi_cable, "sold")
    assert _refused(migrated_engine, home, "lend") == "item_archived"
    assert _refused(migrated_engine, home, "missing") == "item_archived"
    _status(migrated_engine, home.hdmi_cable, "in_use", minute=1)
    with open_write_session(migrated_engine) as session:
        service.mark_item_missing(session, home.hdmi_cable, Actor.app, LATER)
    assert _refused(migrated_engine, home, "in_place") == "use_mark_found"


def test_a_lent_to_name_is_searchable_and_offered_again(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _lend(migrated_engine, home.hdmi_cable, "Sam")
    _lend(migrated_engine, home.usb_c_charger, "Alex", minute=1)
    _lend(migrated_engine, home.hdmi_cable, "Sam", minute=2)
    with open_read_session(migrated_engine) as session:
        found = search.search_home(
            session, Search(query="alex"), date(2026, 11, 16), 50, None
        ).results
        names = service.list_lent_to_names(session, 50, None).items
    assert [each.item.name for each in found if isinstance(each, ItemResult)] == ["USB-C charger"]
    assert [each.name for each in names] == ["Sam", "Alex"]


def test_lending_and_retiring_through_the_api(signed_in: TestClient) -> None:
    site = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    created = signed_in.post("/api/items", json={"name": "Ladder", "home_location_id": site})
    item_id = created.json()["id"]
    lent = signed_in.post(f"/api/items/{item_id}/lend", json={"lent_to": " Sam "})
    assert (lent.status_code, lent.json()["lent_to"]) == (200, "Sam")
    assert signed_in.post(f"/api/items/{item_id}/return").json()["status"] == "in_place"
    sold = signed_in.post(f"/api/items/{item_id}/status", json={"status": "sold"})
    assert sold.json()["status"] == "sold"
    refused = signed_in.post(f"/api/items/{item_id}/status", json={"status": "missing"})
    assert refused.status_code == 422
    names = signed_in.get("/api/items/lent-to-names").json()
    assert names == {"items": [{"name": "Sam"}], "next_cursor": None}
