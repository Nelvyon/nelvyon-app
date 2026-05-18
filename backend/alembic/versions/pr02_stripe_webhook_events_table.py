"""Stripe webhook idempotency table (event.id UNIQUE).

Revision ID: pr02_stripe_webhook_events
Revises: pr01_billing_subscriptions_workspace
Create Date: 2026-04-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pr02_stripe_webhook_events"
down_revision: Union[str, Sequence[str], None] = "pr01_billing_subscriptions_workspace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stripe_event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="received"),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_events_event_id"),
    )
    op.create_index(
        op.f("ix_stripe_webhook_events_stripe_event_id"),
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_stripe_webhook_events_stripe_event_id"), table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
