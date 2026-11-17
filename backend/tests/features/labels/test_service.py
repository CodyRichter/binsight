import pytest
from sqlalchemy import Engine, select

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.features.labels import service
from app.features.labels.schemas import LabelClaim, NewBlankLabels
from app.features.locations import service as locations
from app.models import Actor, HistoryEntry
from tests import builders


def _blanks(engine: Engine, count: int) -> list[str]:
    with open_write_session(engine) as session:
        created = service.create_blank_labels(
            session, NewBlankLabels(count=count), Actor.app, builders.NOW
        )
    return [label.code for label in created.labels]


def _claim(engine: Engine, code: str, location_id: str) -> None:
    with open_write_session(engine) as session:
        claim = LabelClaim(location_id=location_id)
        service.claim_label(session, code, claim, Actor.app, builders.NOW)


def _site(engine: Engine, name: str = "Home") -> str:
    with open_write_session(engine) as session:
        return builders.location(session, name).id


def test_codes_run_in_one_series_across_batches(migrated_engine: Engine) -> None:
    assert _blanks(migrated_engine, 2) == ["B-001", "B-002"]
    assert _blanks(migrated_engine, 1) == ["B-003"]


def test_codes_widen_past_three_digits(migrated_engine: Engine) -> None:
    assert _blanks(migrated_engine, 100)[-1] == "B-100"
    codes = [code for _ in range(10) for code in _blanks(migrated_engine, 100)]
    assert codes[-2:] == ["B-1099", "B-1100"]
    assert "B-999" in codes


def test_a_new_label_is_blank(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 1)
    with open_read_session(migrated_engine) as session:
        label = service.get_label(session, "B-001")
    assert (label.location_id, label.claimed_at) == (None, None)


@pytest.mark.parametrize("typed", ["B-014", "b14", "B014", "b-0014", " b-14 "])
def test_a_code_is_found_whatever_its_case_hyphen_or_padding(
    migrated_engine: Engine, typed: str
) -> None:
    _blanks(migrated_engine, 14)
    with open_read_session(migrated_engine) as session:
        assert service.get_label(session, typed).code == "B-014"


@pytest.mark.parametrize("typed", ["B-015", "C-014", "14", "made-up", ""])
def test_anything_that_is_not_a_label_is_not_found(migrated_engine: Engine, typed: str) -> None:
    _blanks(migrated_engine, 14)
    with pytest.raises(AppError) as refusal, open_read_session(migrated_engine) as session:
        service.get_label(session, typed)
    assert refusal.value.code == "label_not_found"


def test_claiming_attaches_the_label_and_records_it(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 1)
    home = _site(migrated_engine)
    with open_write_session(migrated_engine) as session:
        claimed = service.claim_label(
            session, "b1", LabelClaim(location_id=home), Actor.mcp, builders.NOW
        )
    assert (claimed.code, claimed.location_id, claimed.claimed_at) == ("B-001", home, builders.NOW)
    with open_read_session(migrated_engine) as session:
        entry = session.get(HistoryEntry, claimed.history_entry_id)
        assert entry is not None
        assert (entry.action, entry.actor) == ("label.claimed", Actor.mcp)
        assert [(change.before, change.after) for change in entry.changes] == [
            ({"location_id": None}, {"location_id": home})
        ]


def test_a_batch_of_blanks_is_one_history_entry(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 3)
    with open_read_session(migrated_engine) as session:
        entries = list(session.scalars(select(HistoryEntry)))
        assert [entry.action for entry in entries] == ["label.created"]
        assert [change.after for change in entries[0].changes] == [
            {"code": "B-001"},
            {"code": "B-002"},
            {"code": "B-003"},
        ]


def test_a_claimed_location_shows_its_code(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 1)
    home = _site(migrated_engine)
    _claim(migrated_engine, "B-001", home)
    with open_read_session(migrated_engine) as session:
        assert locations.get_location(session, home).label_code == "B-001"


def test_a_label_already_in_use_cannot_be_claimed_again(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 1)
    _claim(migrated_engine, "B-001", _site(migrated_engine, "Home"))
    with pytest.raises(AppError) as refusal:
        _claim(migrated_engine, "B-001", _site(migrated_engine, "Car"))
    assert (refusal.value.status, refusal.value.code) == (409, "label_already_claimed")


def test_a_location_takes_only_one_label(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 2)
    home = _site(migrated_engine)
    _claim(migrated_engine, "B-001", home)
    with pytest.raises(AppError) as refusal:
        _claim(migrated_engine, "B-002", home)
    assert (refusal.value.status, refusal.value.code) == (409, "location_has_label")
    assert "Home already has the label B-001" in refusal.value.message


def test_a_label_cannot_be_claimed_for_an_unknown_location(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 1)
    with pytest.raises(AppError) as refusal:
        _claim(migrated_engine, "B-001", "made-up")
    assert refusal.value.code == "location_not_found"


def test_labels_are_listed_newest_code_first_a_page_at_a_time(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 5)
    with open_read_session(migrated_engine) as session:
        first = service.list_labels(session, 3, None)
        assert first.next_cursor is not None
        second = service.list_labels(session, 3, first.next_cursor)
    assert [label.code for label in first.items] == ["B-005", "B-004", "B-003"]
    assert [label.code for label in second.items] == ["B-002", "B-001"]
    assert second.next_cursor is None


def test_a_claimed_code_names_its_location(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 2)
    home = _site(migrated_engine)
    _claim(migrated_engine, "B-001", home)
    with open_read_session(migrated_engine) as session:
        assert service.location_id_for(session, "b1") == home
        assert service.location_id_for(session, home) == home
        # A blank label names no location, so the code is passed on and later not found.
        assert service.location_id_for(session, "B-002") == "B-002"


def test_the_image_is_a_png_named_by_its_code(migrated_engine: Engine) -> None:
    _blanks(migrated_engine, 14)
    with open_read_session(migrated_engine) as session:
        image = service.label_image(session, "b14", "https://binsight.example.com")
    assert image.code == "B-014"
    assert image.png.startswith(b"\x89PNG\r\n\x1a\n")
