from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from sqlite3 import Connection as SqliteConnection
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

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


@contextmanager
def open_write_session(engine: Engine) -> Iterator[Session]:
    """Give a session for one action: commit when it returns, roll back when it raises."""
    locking_engine = engine.execution_options(**{WRITE_LOCK_OPTION: True})
    with Session(locking_engine) as session, session.begin():
        yield session


def read_session(request: Request) -> Iterator[Session]:
    with open_read_session(request.app.state.engine) as session:
        yield session


def write_session(request: Request) -> Iterator[Session]:
    with open_write_session(request.app.state.engine) as session:
        yield session


# "function" scope ends the transaction before the response is sent.
ReadSession = Annotated[Session, Depends(read_session, scope="function")]
WriteSession = Annotated[Session, Depends(write_session, scope="function")]
