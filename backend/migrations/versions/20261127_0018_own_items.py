"""A location's own item: the item that a desk or a toolbox is itself.

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: str | Sequence[str] | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("item") as table:
        table.add_column(sa.Column("own_item_of", sa.String(), nullable=True))
        table.create_foreign_key(
            op.f("fk_item_own_item_of_location"), "location", ["own_item_of"], ["id"]
        )
        table.create_unique_constraint(op.f("uq_item_own_item_of"), ["own_item_of"])
        table.create_check_constraint(
            "own_item_at_home", "own_item_of IS NULL OR own_item_of = home_location_id"
        )
