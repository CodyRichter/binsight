"""Checks of a location's contents, and the missing status on items.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | Sequence[str] | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("item") as table:
        table.add_column(
            sa.Column(
                "status",
                sa.Enum("in_place", "missing", name="itemstatus", native_enum=False),
                nullable=False,
                server_default="in_place",
            )
        )
    op.create_table(
        "check",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("location_id", sa.String(), nullable=False),
        sa.Column("checked_at", sa.DateTime(), nullable=False),
        sa.Column("actor", sa.Enum("app", "mcp", name="actor", native_enum=False), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["location_id"], ["location.id"], name=op.f("fk_check_location_id_location")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_check")),
    )
    op.create_index(op.f("ix_check_location_id"), "check", ["location_id"])
