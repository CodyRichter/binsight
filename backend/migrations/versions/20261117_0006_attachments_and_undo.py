"""Photos on items, and the link from an undone history entry to the entry that undid it.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attachment",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("item_id", sa.String(), nullable=False),
        sa.Column(
            "kind", sa.Enum("photo", name="attachmentkind", native_enum=False), nullable=False
        ),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["item.id"], name=op.f("fk_attachment_item_id_item")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attachment")),
    )
    op.create_index(op.f("ix_attachment_item_id"), "attachment", ["item_id"])
    with op.batch_alter_table("history_entry") as table:
        table.add_column(sa.Column("undone_by", sa.String(), nullable=True))
        table.create_foreign_key(
            op.f("fk_history_entry_undone_by_history_entry"),
            "history_entry",
            ["undone_by"],
            ["id"],
        )
