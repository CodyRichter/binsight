"""Deleting items, and the confirmations MCP tools hand out before deleting.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | Sequence[str] | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("item") as table:
        table.add_column(sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.create_table(
        "confirmation",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tool", sa.String(), nullable=False),
        sa.Column("inputs", sa.JSON(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_confirmation")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_confirmation_token_hash")),
    )
