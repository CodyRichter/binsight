"""Checks of a location's contents are no longer kept (decision 0020).

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-24
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0015"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A check entry's item changes stay, so marking items missing in a check can still be undone.
    op.execute("DELETE FROM history_change WHERE record_type = 'check'")
    op.drop_index(op.f("ix_check_location_id"), table_name="check")
    op.drop_table("check")
