"""A location's chosen icon.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | Sequence[str] | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("location") as table:
        table.add_column(sa.Column("icon", sa.String(), nullable=True))
