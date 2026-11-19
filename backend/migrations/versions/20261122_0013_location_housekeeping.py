"""Deleting locations, and their order among their siblings.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | Sequence[str] | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("location") as table:
        table.add_column(sa.Column("deleted_at", sa.DateTime(), nullable=True))
        table.add_column(sa.Column("position", sa.Integer(), nullable=True))
    # Siblings keep the order they were shown in: oldest first.
    op.execute(
        "UPDATE location SET position = ("
        " SELECT numbered.row_number FROM ("
        "  SELECT id, ROW_NUMBER() OVER ("
        "   PARTITION BY parent_id ORDER BY created_at, id) - 1 AS row_number"
        "  FROM location) AS numbered"
        " WHERE numbered.id = location.id)"
    )
    with op.batch_alter_table("location") as table:
        table.alter_column("position", existing_type=sa.Integer(), nullable=False)
