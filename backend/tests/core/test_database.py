import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import Engine, text

from app.core.database import open_read_session, open_write_session


def _make_table(engine: Engine) -> None:
    with open_write_session(engine) as session:
        session.execute(text("CREATE TABLE note (body TEXT)"))


def _database_path(engine: Engine) -> Path:
    assert engine.url.database
    return Path(engine.url.database)


def _can_take_write_lock(engine: Engine) -> bool:
    other = sqlite3.connect(_database_path(engine), timeout=0, isolation_level=None)
    try:
        other.execute("BEGIN IMMEDIATE")
    except sqlite3.OperationalError:
        return False
    finally:
        other.close()
    return True


def _note_count(engine: Engine) -> int:
    with open_read_session(engine) as session:
        count: int = session.execute(text("SELECT count(*) FROM note")).scalar_one()
        return count


def _insert_then_refuse(engine: Engine) -> None:
    with open_write_session(engine) as session:
        session.execute(text("INSERT INTO note VALUES ('lost')"))
        raise RuntimeError("refused")


def test_connections_use_write_ahead_log_and_foreign_keys(engine: Engine) -> None:
    with open_read_session(engine) as session:
        assert session.execute(text("PRAGMA journal_mode")).scalar_one() == "wal"
        assert session.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
        assert session.execute(text("PRAGMA busy_timeout")).scalar_one() == 5000


def test_a_write_session_takes_the_write_lock_before_writing(engine: Engine) -> None:
    _make_table(engine)
    with open_write_session(engine) as session:
        session.execute(text("SELECT count(*) FROM note"))
        assert not _can_take_write_lock(engine)
    assert _can_take_write_lock(engine)


def test_a_read_session_leaves_the_write_lock_free(engine: Engine) -> None:
    _make_table(engine)
    with open_read_session(engine) as session:
        session.execute(text("SELECT count(*) FROM note"))
        assert _can_take_write_lock(engine)


def test_a_write_session_commits_when_the_action_returns(engine: Engine) -> None:
    _make_table(engine)
    with open_write_session(engine) as session:
        session.execute(text("INSERT INTO note VALUES ('kept')"))
    assert _note_count(engine) == 1


def test_a_write_session_rolls_back_when_the_action_raises(engine: Engine) -> None:
    _make_table(engine)
    with pytest.raises(RuntimeError, match="refused"):
        _insert_then_refuse(engine)
    assert _note_count(engine) == 0
