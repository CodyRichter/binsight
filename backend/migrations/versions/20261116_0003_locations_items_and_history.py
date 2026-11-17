"""Locations, items, and the history entries that record changes to them.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LOCATION_TYPES = ("site", "room", "furniture", "shelf", "bin", "drawer", "box")


def _create_locations() -> None:
    op.create_table(
        "location",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "type", sa.Enum(*LOCATION_TYPES, name="locationtype", native_enum=False), nullable=False
        ),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["parent_id"], ["location.id"], name=op.f("fk_location_parent_id_location")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location")),
    )
    op.create_index(op.f("ix_location_parent_id"), "location", ["parent_id"])


def _create_items() -> None:
    op.create_table(
        "item",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("home_location_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("quantity >= 0", name=op.f("ck_item_quantity_not_negative")),
        sa.ForeignKeyConstraint(
            ["home_location_id"], ["location.id"], name=op.f("fk_item_home_location_id_location")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_item")),
    )
    op.create_index(op.f("ix_item_home_location_id"), "item", ["home_location_id"])


def _create_history() -> None:
    op.create_table(
        "history_entry",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("at", sa.DateTime(), nullable=False),
        sa.Column("actor", sa.Enum("app", "mcp", name="actor", native_enum=False), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_history_entry")),
    )
    op.create_table(
        "history_change",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("entry_id", sa.String(), nullable=False),
        sa.Column("record_type", sa.String(), nullable=False),
        sa.Column("record_id", sa.String(), nullable=False),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["entry_id"],
            ["history_entry.id"],
            name=op.f("fk_history_change_entry_id_history_entry"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_history_change")),
    )
    op.create_index(op.f("ix_history_change_entry_id"), "history_change", ["entry_id"])
    op.create_index(op.f("ix_history_change_record_id"), "history_change", ["record_id"])


def upgrade() -> None:
    _create_locations()
    _create_items()
    _create_history()
