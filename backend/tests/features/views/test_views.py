from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.settings import Settings
from app.features.checks import service as checks
from app.features.checks.schemas import CheckLocation
from app.features.history import service as history
from app.features.items import service as items
from app.features.items.schemas import ItemChanges, ItemLending, ItemMove, ItemStatusChange
from app.features.views import service
from app.features.views.schemas import ViewItem, ViewLocation, ViewName
from app.models import Actor
from tests import builders
from tests.builders import AcceptanceHome

# Two months after the acceptance home was made, so it no longer counts as recently added.
NOW = builders.NOW + timedelta(days=60)
TODAY = NOW.date()


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        return builders.acceptance_home(session)


def _names(engine: Engine, view: ViewName, now: datetime = NOW) -> list[str | None]:
    with open_read_session(engine) as session:
        rows = service.list_view_rows(session, view, now, 50, None).items
    return [row.item.name if isinstance(row, ViewItem) else row.location.name for row in rows]


def _counts(engine: Engine, now: datetime = NOW) -> dict[str, int]:
    with open_read_session(engine) as session:
        return {each.view: each.count for each in service.list_views(session, now, 50, None).items}


def _change(engine: Engine, item_id: str, changes: ItemChanges) -> None:
    with open_write_session(engine) as session:
        items.update_item(session, item_id, changes, Actor.app, NOW)


def _status(engine: Engine, item_id: str, status: str) -> None:
    change = ItemStatusChange.model_validate({"status": status})
    with open_write_session(engine) as session:
        items.change_item_status(session, item_id, change, Actor.app, NOW)


def test_every_view_is_listed_in_order_with_its_count(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        items.lend_item(session, home.hdmi_cable, ItemLending(lent_to="Sam"), Actor.app, NOW)
    assert _counts(migrated_engine) == {
        "lent-out": 1,
        "missing": 0,
        "warranty-ending": 0,
        "return-closing": 0,
        "recently-added": 0,
        "recently-moved": 0,
        "not-checked": 1,
        "possible-duplicates": 0,
        "archive": 0,
    }
    assert _names(migrated_engine, "lent-out") == ["HDMI cable"]


def test_warranty_and_return_views_look_30_days_ahead_soonest_first(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _change(migrated_engine, home.hdmi_cable, ItemChanges(warranty_ends=TODAY + timedelta(30)))
    _change(migrated_engine, home.usb_c_charger, ItemChanges(warranty_ends=TODAY))
    with open_write_session(migrated_engine) as session:
        late = builders.item(session, "Drill", home.tools, NOW).id
        ended = builders.item(session, "Saw", home.tools, NOW).id
    _change(migrated_engine, late, ItemChanges(warranty_ends=TODAY + timedelta(31)))
    _change(migrated_engine, ended, ItemChanges(warranty_ends=TODAY - timedelta(1)))
    _change(migrated_engine, ended, ItemChanges(return_ends=TODAY + timedelta(3)))
    assert _names(migrated_engine, "warranty-ending") == ["USB-C charger", "HDMI cable"]
    assert _names(migrated_engine, "return-closing") == ["Saw"]


def test_recently_added_covers_the_last_30_days_newest_first(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Drill", home.tools, NOW - timedelta(days=31))
        builders.item(session, "Saw", home.tools, NOW - timedelta(days=2))
        builders.item(session, "Level", home.tools, NOW - timedelta(days=1))
    assert _names(migrated_engine, "recently-added") == ["Level", "Saw"]


def test_recently_moved_leaves_out_a_move_that_was_undone(
    migrated_engine: Engine, settings: Settings, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        moved = ItemMove(location_id=home.tools)
        items.move_item(session, home.hdmi_cable, moved, Actor.app, NOW - timedelta(days=1))
        undone = items.move_item(session, home.usb_c_charger, moved, Actor.app, NOW)
        history.undo(session, settings, undone.history_entry_id, Actor.app, NOW)
    assert _names(migrated_engine, "recently-moved") == ["HDMI cable"]
    assert _counts(migrated_engine)["recently-moved"] == 1


def test_the_archive_holds_only_retired_items_and_no_other_view_does(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    _change(migrated_engine, home.hdmi_cable, ItemChanges(warranty_ends=TODAY))
    _status(migrated_engine, home.hdmi_cable, "sold")
    assert _names(migrated_engine, "archive") == ["HDMI cable"]
    assert _names(migrated_engine, "warranty-ending") == []


def test_possible_duplicates_share_a_name_ignoring_case(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "hdmi CABLE", home.tools, NOW)
        builders.item(session, "Drill", home.tools, NOW)
    assert _names(migrated_engine, "possible-duplicates") == ["HDMI cable", "hdmi CABLE"]
    _status(migrated_engine, home.hdmi_cable, "given_away")
    assert _names(migrated_engine, "possible-duplicates") == []


def test_not_checked_lists_locations_with_items_never_checked_first(
    migrated_engine: Engine, home: AcceptanceHome
) -> None:
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Drill", home.tools, NOW)
        builders.item(session, "Box of screws", home.shelf, NOW)
        long_ago = NOW - timedelta(days=400)
        checks.check_location(session, home.cables, CheckLocation(), Actor.app, long_ago)
        recent = NOW - timedelta(days=10)
        checks.check_location(session, home.shelf, CheckLocation(), Actor.app, recent)
    assert _names(migrated_engine, "not-checked") == ["Tools", "Cables"]
    with open_read_session(migrated_engine) as session:
        first = service.list_view_rows(session, "not-checked", NOW, 1, None)
    assert isinstance(first.items[0], ViewLocation)
    assert first.next_cursor is not None


def test_a_view_is_read_a_page_at_a_time(migrated_engine: Engine, home: AcceptanceHome) -> None:
    with open_write_session(migrated_engine) as session:
        for day in range(3):
            builders.item(session, f"Thing {day}", home.tools, NOW - timedelta(days=day))
    with open_read_session(migrated_engine) as session:
        first = service.list_view_rows(session, "recently-added", NOW, 2, None)
        second = service.list_view_rows(session, "recently-added", NOW, 2, first.next_cursor)
    assert [row.item.name for row in first.items if isinstance(row, ViewItem)] == [
        "Thing 0",
        "Thing 1",
    ]
    assert [row.item.name for row in second.items if isinstance(row, ViewItem)] == ["Thing 2"]
    assert second.next_cursor is None


def test_an_unknown_view_is_refused(signed_in: TestClient) -> None:
    assert signed_in.get("/api/views/everything").status_code == 422
    assert signed_in.get("/api/views").json()["items"][0]["title"] == "Lent out"
