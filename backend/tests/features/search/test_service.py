from datetime import date

from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.features.items import service as items
from app.features.items.schemas import ItemChanges
from app.features.locations import service as locations
from app.features.locations.schemas import NewLocation
from app.features.search import service
from app.features.search.schemas import ItemResult, LocationResult, Search, SearchResults
from app.models import LocationType
from tests import builders
from tests.builders import APP_ACTOR, AcceptanceHome

TODAY = date(2026, 11, 16)
PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def _home(engine: Engine) -> AcceptanceHome:
    with open_write_session(engine) as session:
        return builders.acceptance_home(session)


def _search(
    engine: Engine, query: str, limit: int = 50, cursor: str | None = None
) -> SearchResults:
    with open_read_session(engine) as session:
        return service.search_home(session, Search(query=query), TODAY, limit, cursor)


def _names(results: SearchResults) -> list[str | None]:
    return [
        result.item.name if isinstance(result, ItemResult) else result.location.name
        for result in results.results
    ]


def test_hdmi_finds_the_cable_with_its_full_path(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    found = _search(migrated_engine, "hdmi")
    first = found.results[0]
    assert isinstance(first, ItemResult)
    assert first.item.id == home.hdmi_cable
    assert [step.name for step in first.item.path] == PATH_TO_CABLES
    assert [(mark.start, mark.end) for mark in first.marks] == [(0, 4)]


def test_a_typo_and_reversed_words_still_find_it(migrated_engine: Engine) -> None:
    _home(migrated_engine)
    assert _names(_search(migrated_engine, "hdmi cabel")) == ["HDMI cable"]
    assert _names(_search(migrated_engine, "cable hdmi")) == ["HDMI cable"]


def test_a_location_code_typed_loosely_finds_its_location(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    for typed in (home.cables, home.cables.lower(), home.cables.replace("-", "").lower()):
        first = _search(migrated_engine, typed).results[0]
        assert isinstance(first, LocationResult)
        assert first.location.id == home.cables


def test_a_location_is_found_by_its_name_with_its_counts(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    first = _search(migrated_engine, "garage").results[0]
    assert isinstance(first, LocationResult)
    assert (first.location.id, first.location.item_count) == (home.garage, 2)


def test_a_word_in_a_summary_finds_its_location(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    with open_write_session(migrated_engine) as session:
        new = NewLocation(
            name="Top drawer", type=LocationType.drawer, parent_id=home.garage, summary="Batteries"
        )
        drawer = locations.create_location(session, new, APP_ACTOR, builders.NOW).id
    assert [
        result.location.id
        for result in _search(migrated_engine, "batteries").results
        if isinstance(result, LocationResult)
    ] == [drawer]


def test_an_exact_name_ranks_above_a_typo(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Cabel organiser", home.cables)
    assert _names(_search(migrated_engine, "cabel"))[0] == "Cabel organiser"


def test_items_come_before_locations_with_the_same_match(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    with open_write_session(migrated_engine) as session:
        builders.item(session, "Tools", home.garage)
    found = _search(migrated_engine, "tools").results
    assert [result.kind for result in found] == ["item", "location"]


def test_a_blank_query_finds_nothing(migrated_engine: Engine) -> None:
    _home(migrated_engine)
    assert _search(migrated_engine, "  - ") == SearchResults(results=[], next_cursor=None, count=0)


def test_pages_hold_every_result_once(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    with open_write_session(migrated_engine) as session:
        for number in range(5):
            builders.item(session, f"Spare cable {number}", home.cables)
    first = _search(migrated_engine, "cable", limit=4)
    assert (first.count, len(first.results)) == (7, 4)
    second = _search(migrated_engine, "cable", limit=4, cursor=first.next_cursor)
    assert second.next_cursor is None
    assert len(set(_names(first) + _names(second))) == 7


def test_an_item_is_found_by_its_serial_number_a_tag_or_a_word_in_its_notes(
    migrated_engine: Engine,
) -> None:
    home = _home(migrated_engine)
    changes = ItemChanges(serial_number="SN-0042", tags=["video"], notes="Spare for the projector")
    with open_write_session(migrated_engine) as session:
        items.update_item(session, home.hdmi_cable, changes, APP_ACTOR, builders.NOW)
    for query in ("sn 0042", "video", "projector"):
        assert _names(_search(migrated_engine, query)) == ["HDMI cable"]


def test_a_name_ranks_above_a_word_in_another_item_s_details(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    changes = ItemChanges(notes="Plugs into the HDMI cable")
    with open_write_session(migrated_engine) as session:
        items.update_item(session, home.usb_c_charger, changes, APP_ACTOR, builders.NOW)
    assert _names(_search(migrated_engine, "hdmi cable")) == ["HDMI cable", "USB-C charger"]


def _filtered(engine: Engine, query: str = "", **filters: str) -> list[str | None]:
    with open_read_session(engine) as session:
        search = Search.model_validate({"query": query, **filters})
        found = service.search_home(session, search, TODAY, 50, None)
    return _names(found)


def test_filters_keep_only_the_items_that_match_every_one(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    with open_write_session(migrated_engine) as session:
        tagged = ItemChanges(category="Cables", tags=["4k"], warranty_ends=TODAY)
        items.update_item(session, home.hdmi_cable, tagged, APP_ACTOR, builders.NOW)
    assert _filtered(migrated_engine, category="CABLES") == ["HDMI cable"]
    assert _filtered(migrated_engine, tag="4K") == ["HDMI cable"]
    assert _filtered(migrated_engine, status="in_place", warranty="ending_soon") == ["HDMI cable"]
    assert _filtered(migrated_engine, warranty="ended") == []
    assert _filtered(migrated_engine, "charger", category="Cables") == []


def test_a_location_filter_keeps_everything_inside_it(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    assert _filtered(migrated_engine, location_id=home.shelf) == [
        "HDMI cable",
        "USB-C charger",
        "Cables",
        "Shelf 2",
        "Tools",
    ]
    assert _filtered(migrated_engine, "cables", location_id=home.tools) == []


def test_no_words_and_no_filters_find_nothing(migrated_engine: Engine) -> None:
    _home(migrated_engine)
    assert _filtered(migrated_engine) == []
