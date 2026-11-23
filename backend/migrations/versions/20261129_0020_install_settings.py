"""Install settings: the print address Direct Print sends labels to.

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: str | Sequence[str] | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "install_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("print_address", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_install_settings")),
    )
