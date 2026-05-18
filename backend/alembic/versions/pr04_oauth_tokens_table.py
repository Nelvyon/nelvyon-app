"""Tabla oauth_tokens (integraciones OAuth por workspace).

Revision ID: pr04_oauth_tokens
Revises: c1_2_messages_workspace_backfill
Create Date: 2026-04-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pr04_oauth_tokens"
down_revision: Union[str, Sequence[str], None] = "c1_2_messages_workspace_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oauth_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_type", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes_json", sa.Text(), nullable=True),
        sa.Column("account_name", sa.String(), nullable=True),
        sa.Column("account_id", sa.String(), nullable=True),
        sa.Column("extra_json", sa.Text(), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "user_id",
            "provider",
            name="uq_oauth_tokens_ws_user_provider",
        ),
    )


def downgrade() -> None:
    op.drop_table("oauth_tokens")
