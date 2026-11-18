from datetime import date
from enum import Enum
from typing import Any

from sqlalchemy import inspect, select
from sqlalchemy.orm import DeclarativeBase, Session


def _plain(value: object) -> object:
    if isinstance(value, Enum):
        return value.value
    return value.isoformat() if isinstance(value, date) else value


def table_rows(session: Session, model: type[DeclarativeBase]) -> list[dict[str, Any]]:
    """Every row of one table as plain JSON values, column by column, for an export."""
    mapper = inspect(model)
    # The table's own columns: computed ones, such as a location's item count, are not stored.
    stored = list(mapper.local_table.columns)
    keys = [mapper.get_property_by_column(column).key for column in stored]
    rows = session.execute(select(*stored).order_by(*mapper.primary_key))
    return [{key: _plain(value) for key, value in zip(keys, row, strict=True)} for row in rows]


type ExportTables = dict[str, list[dict[str, Any]]]
"""Tables by name, each a list of rows, as a feature hands them to the export."""
