"""Accounts with roles replace the one owner, and history keeps who made a change (0022).

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: str | Sequence[str] | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The old owner had no username to carry over; the next visit makes the first admin.
    op.drop_table("login_session")
    op.drop_table("owner")
    op.create_table(
        "account",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("viewer", "editor", "admin", name="role", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_account")),
        sa.UniqueConstraint("username", name=op.f("uq_account_username")),
    )
    op.create_table(
        "login_session",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("account_id", sa.String(), nullable=False),
        sa.Column("secret_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["account_id"], ["account.id"], name=op.f("fk_login_session_account_id_account")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_login_session")),
        sa.UniqueConstraint("secret_hash", name=op.f("uq_login_session_secret_hash")),
    )
    op.create_index(
        op.f("ix_login_session_account_id"), "login_session", ["account_id"], unique=False
    )
    with op.batch_alter_table("history_entry") as batch:
        batch.add_column(sa.Column("username", sa.String(), nullable=True))
