import re
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_write_session
from app.features.locations import codes

CODE_SHAPE = re.compile(r"[A-Z0-9]{3}-[A-Z0-9]{3}")


def test_a_new_location_is_known_by_a_six_character_code(signed_in: TestClient) -> None:
    made = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()
    assert CODE_SHAPE.fullmatch(made["id"])
    assert signed_in.get(f"/api/locations/{made['id']}").json()["name"] == "Home"


@pytest.mark.parametrize(
    "code", ["ASS-123", "1SH-1T9", "A5S-000", "XKK-K00", "9FU-CK2", "P0R-NXX", "A14-88Z"]
)
def test_a_code_spelling_something_offensive_is_blocked(code: str) -> None:
    assert codes.is_blocked(code)


@pytest.mark.parametrize("code", ["K7Q-4MZ", "B2R-W9T", "QXZ-JVM"])
def test_an_ordinary_code_is_not_blocked(code: str) -> None:
    assert not codes.is_blocked(code)


def test_a_blocked_draw_is_drawn_again(
    migrated_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    characters: Iterator[str] = iter("SHITXXK7Q4MZ")
    monkeypatch.setattr("secrets.choice", lambda _: next(characters))
    with open_write_session(migrated_engine) as session:
        assert codes.new_location_code(session) == "K7Q-4MZ"


@pytest.mark.parametrize("typed", ["K7Q-4MZ", "k7q4mz", " k7q-4mz "])
def test_a_typed_code_is_read_in_any_case_with_or_without_the_hyphen(typed: str) -> None:
    assert codes.location_code(typed) == "K7Q-4MZ"


@pytest.mark.parametrize("typed", ["Shelf 2", "K7Q-4M", "abc_def", ""])
def test_text_that_is_not_a_code_is_left_as_typed(typed: str) -> None:
    assert codes.location_code(typed) == typed
