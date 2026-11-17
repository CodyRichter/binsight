"""Labels: the codes printed on stickers, blank until claimed for a location.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | Sequence[str] | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "label",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("location_id", sa.String(), nullable=True),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["location_id"], ["location.id"], name=op.f("fk_label_location_id_location")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_label")),
        sa.UniqueConstraint("code", name=op.f("uq_label_code")),
        sa.UniqueConstraint("location_id", name=op.f("uq_label_location_id")),
        sa.UniqueConstraint("number", name=op.f("uq_label_number")),
    )
