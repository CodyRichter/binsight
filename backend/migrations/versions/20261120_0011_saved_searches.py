"""Saved searches.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | Sequence[str] | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_search",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("location_id", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("tag", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("warranty", sa.String(), nullable=True),
        sa.Column("pinned", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_saved_search")),
    )
