from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.features.locations import service as locations
from app.features.locations.schemas import NewLocation
from app.features.search import service
from app.features.search.schemas import ItemResult, LocationResult, SearchResults
from app.models import Actor, LocationType
from tests import builders
from tests.builders import AcceptanceHome

PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def _home(engine: Engine) -> AcceptanceHome:
    with open_write_session(engine) as session:
        return builders.acceptance_home(session)


def _search(
    engine: Engine, query: str, limit: int = 50, cursor: str | None = None
) -> SearchResults:
    with open_read_session(engine) as session:
        return service.search_home(session, query, limit, cursor)


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


def test_a_label_code_typed_loosely_finds_its_location(migrated_engine: Engine) -> None:
    home = _home(migrated_engine)
    for typed in ("b14", "B-014", "b-14"):
        first = _search(migrated_engine, typed).results[0]
        assert isinstance(first, LocationResult)
        assert (first.location.id, first.location.label_code) == (home.cables, "B-014")


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
        drawer = locations.create_location(session, new, Actor.app, builders.NOW).id
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
