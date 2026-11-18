"""Files and web links on items, and a photo on a location.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | Sequence[str] | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("attachment") as table:
        table.alter_column(
            "kind",
            existing_type=sa.Enum("photo", name="attachmentkind", native_enum=False),
            type_=sa.Enum("photo", "file", "link", name="attachmentkind", native_enum=False),
            existing_nullable=False,
        )
        table.alter_column("item_id", existing_type=sa.String(), nullable=True)
        table.alter_column("path", existing_type=sa.String(), nullable=True)
        table.add_column(sa.Column("location_id", sa.String(), nullable=True))
        table.add_column(sa.Column("url", sa.String(), nullable=True))
        table.add_column(sa.Column("content_type", sa.String(), nullable=True))
        table.add_column(sa.Column("size", sa.Integer(), nullable=True))
        table.create_foreign_key(
            op.f("fk_attachment_location_id_location"), "location", ["location_id"], ["id"]
        )
        table.create_index(op.f("ix_attachment_location_id"), ["location_id"])
        table.create_check_constraint("one_owner", "(item_id IS NULL) != (location_id IS NULL)")
        table.create_check_constraint(
            "locations_take_photos", "location_id IS NULL OR kind = 'photo'"
        )
        table.create_check_constraint(
            "a_link_has_no_file",
            "(kind = 'link') = (url IS NOT NULL) AND (kind = 'link') = (path IS NULL)",
        )
    # Every photo so far was stored as JPEG.
    op.execute("UPDATE attachment SET content_type = 'image/jpeg' WHERE kind = 'photo'")
