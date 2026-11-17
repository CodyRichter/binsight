from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from sqlite3 import Connection as SqliteConnection
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session, UOWTransaction

from app.models import HistoryEntry, Item, Label, Location

WRITE_LOCK_OPTION = "binsight_write_lock"


def _configure_connection(dbapi_connection: SqliteConnection, _record: object) -> None:
    # Leave BEGIN to the "begin" hook below, so writes can take the lock up front.
    dbapi_connection.isolation_level = None
    dbapi_connection.execute("PRAGMA journal_mode=WAL")
    dbapi_connection.execute("PRAGMA busy_timeout=5000")
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


def _begin(connection: Connection) -> None:
    if connection.get_execution_options().get(WRITE_LOCK_OPTION):
        connection.exec_driver_sql("BEGIN IMMEDIATE")
    else:
        connection.exec_driver_sql("BEGIN")


def create_database_engine(database_path: Path) -> Engine:
    """Open the install's SQLite database with the settings every connection shares."""
    engine = create_engine(f"sqlite:///{database_path}")
    event.listen(engine, "connect", _configure_connection)
    event.listen(engine, "begin", _begin)
    return engine


@contextmanager
def open_read_session(engine: Engine) -> Iterator[Session]:
    """Give a session for reading; it never holds the write lock."""
    with Session(engine) as session, session.begin():
        yield session


def _note_what_changed(session: Session, _flush: UOWTransaction, _instances: object) -> None:
    changed = [*session.new, *session.dirty, *session.deleted]
    if any(isinstance(record, Item | Label | Location) for record in changed):
        session.info["home_changed"] = True
    if any(isinstance(record, HistoryEntry) for record in session.new):
        session.info["history_recorded"] = True


def _require_history(session: Session) -> None:
    session.flush()
    if session.info.get("home_changed") and not session.info.get("history_recorded"):
        raise RuntimeError(
            "An item, label or location changed without a history entry (decision 0009)."
        )


@contextmanager
def open_write_session(engine: Engine) -> Iterator[Session]:
    """Give a session for one action: commit when it returns, roll back when it raises."""
    locking_engine = engine.execution_options(**{WRITE_LOCK_OPTION: True})
    with Session(locking_engine) as session, session.begin():
        event.listen(session, "before_flush", _note_what_changed)
        yield session
        _require_history(session)


def read_session(request: Request) -> Iterator[Session]:
    with open_read_session(request.app.state.engine) as session:
        yield session


def write_session(request: Request) -> Iterator[Session]:
    with open_write_session(request.app.state.engine) as session:
        yield session


# "function" scope ends the transaction before the response is sent.
ReadSession = Annotated[Session, Depends(read_session, scope="function")]
WriteSession = Annotated[Session, Depends(write_session, scope="function")]
