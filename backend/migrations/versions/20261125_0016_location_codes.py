"""A location is known by its code, such as K7Q-4MZ, and labels are no longer a table (0021).

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-25
"""

import json
import secrets
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.features.locations.codes import ALPHABET, is_blocked

revision: str = "0016"
down_revision: str | Sequence[str] | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOCATION_COLUMNS = (
    ("location", "id"),
    ("location", "parent_id"),
    ("item", "home_location_id"),
    ("attachment", "location_id"),
    ("saved_search", "location_id"),
    ("history_change", "record_id"),
)


def _new_codes(old_ids: list[str]) -> dict[str, str]:
    codes: dict[str, str] = {}
    while len(codes) < len(old_ids):
        joined = "".join(secrets.choice(ALPHABET) for _ in range(6))
        code = f"{joined[:3]}-{joined[3:]}"
        if not is_blocked(code) and code not in codes.values():
            codes[old_ids[len(codes)]] = code
    return codes


def _recoded(value: object, codes: dict[str, str]) -> object:
    if isinstance(value, str):
        return codes.get(value, value)
    if isinstance(value, list):
        return [_recoded(each, codes) for each in value]
    if isinstance(value, dict):
        return {key: _recoded(each, codes) for key, each in value.items()}
    return value


def _recode_history(connection: sa.Connection, codes: dict[str, str]) -> None:
    rows = connection.execute(sa.text("SELECT id, before, after FROM history_change")).all()
    for change_id, before, after in rows:
        connection.execute(
            sa.text("UPDATE history_change SET before = :before, after = :after WHERE id = :id"),
            {
                "id": change_id,
                "before": None
                if before is None
                else json.dumps(_recoded(json.loads(before), codes)),
                "after": json.dumps(_recoded(json.loads(after), codes)),
            },
        )


def upgrade() -> None:
    connection = op.get_bind()
    # Ids are rewritten table by table, so references are checked once all of them agree.
    op.execute("PRAGMA defer_foreign_keys = ON")
    op.execute("DELETE FROM history_change WHERE record_type = 'label'")
    op.execute("DELETE FROM history_entry WHERE action LIKE 'label.%'")
    op.execute("DELETE FROM confirmation")
    op.drop_table("label")
    old_ids = list(connection.execute(sa.text("SELECT id FROM location")).scalars())
    codes = _new_codes(old_ids)
    for old_id, code in codes.items():
        for table, column in LOCATION_COLUMNS:
            holder = sa.table(table, sa.column(column))
            connection.execute(
                sa.update(holder).where(holder.c[column] == old_id).values({column: code})
            )
    _recode_history(connection, codes)
