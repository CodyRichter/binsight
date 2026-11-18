"""An item's optional details, its category and its tags.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | Sequence[str] | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "category",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_category")),
        sa.UniqueConstraint("name", name=op.f("uq_category_name")),
    )
    with op.batch_alter_table("item") as table:
        table.add_column(sa.Column("category_id", sa.String(), nullable=True))
        for text_field in ("notes", "brand", "model", "serial_number", "order_link"):
            table.add_column(sa.Column(text_field, sa.String(), nullable=True))
        for date_field in ("purchase_date", "warranty_ends", "return_ends"):
            table.add_column(sa.Column(date_field, sa.Date(), nullable=True))
        table.add_column(sa.Column("price_cents", sa.Integer(), nullable=True))
        table.create_check_constraint("price_not_negative", "price_cents >= 0")
        table.create_foreign_key(
            op.f("fk_item_category_id_category"), "category", ["category_id"], ["id"]
        )
        table.create_index(op.f("ix_item_category_id"), ["category_id"])
    op.create_table(
        "item_tag",
        sa.Column("item_id", sa.String(), nullable=False),
        sa.Column("tag", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"], name=op.f("fk_item_tag_item_id_item")),
        sa.PrimaryKeyConstraint("item_id", "tag", name=op.f("pk_item_tag")),
    )
    op.create_index(op.f("ix_item_tag_tag"), "item_tag", ["tag"])
