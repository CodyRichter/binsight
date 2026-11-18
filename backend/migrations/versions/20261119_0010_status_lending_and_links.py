"""Every status, lending, retiring, and links between items.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | Sequence[str] | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUSES = ("in_place", "in_use", "lent_out", "missing", "sold", "given_away", "thrown_away")


def upgrade() -> None:
    with op.batch_alter_table("item") as table:
        table.alter_column(
            "status",
            existing_type=sa.Enum("in_place", "missing", name="itemstatus", native_enum=False),
            type_=sa.Enum(*STATUSES, name="itemstatus", native_enum=False),
            existing_nullable=False,
            existing_server_default="in_place",
        )
        table.add_column(sa.Column("lent_to", sa.String(), nullable=True))
        table.add_column(sa.Column("lent_at", sa.DateTime(), nullable=True))
        table.add_column(sa.Column("retired_at", sa.DateTime(), nullable=True))
        table.create_check_constraint(
            "lent_to_only_when_lent_out", "(status = 'lent_out') = (lent_to IS NOT NULL)"
        )
    op.create_table(
        "item_link",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("item_id", sa.String(), nullable=False),
        sa.Column("other_item_id", sa.String(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("belongs_with", "part_of", name="linkkind", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("item_id != other_item_id", name=op.f("ck_item_link_links_two_items")),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"], name=op.f("fk_item_link_item_id_item")),
        sa.ForeignKeyConstraint(
            ["other_item_id"], ["item.id"], name=op.f("fk_item_link_other_item_id_item")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_item_link")),
        sa.UniqueConstraint("item_id", "other_item_id", "kind", name=op.f("one_link_of_each_kind")),
    )
    op.create_index(op.f("ix_item_link_item_id"), "item_link", ["item_id"])
    op.create_index(op.f("ix_item_link_other_item_id"), "item_link", ["other_item_id"])
