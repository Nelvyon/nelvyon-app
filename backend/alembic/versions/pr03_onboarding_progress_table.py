"""Tabla onboarding_progress (progreso por workspace/usuario/paso).

Revision ID: pr03_onboarding_progress
Revises: pr02_stripe_webhook_events
Create Date: 2026-04-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pr03_onboarding_progress"
down_revision: Union[str, Sequence[str], None] = "pr02_stripe_webhook_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "onboarding_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("step_key", sa.String(), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default=sa.text("false"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_json", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "user_id",
            "step_key",
            name="uq_onboarding_progress_ws_user_step",
        ),
    )
    op.create_index(
        op.f("ix_onboarding_progress_workspace_id"),
        "onboarding_progress",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_onboarding_progress_workspace_id"), table_name="onboarding_progress")
    op.drop_table("onboarding_progress")
