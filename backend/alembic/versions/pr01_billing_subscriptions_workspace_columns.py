"""Billing PR#1: subscriptions titular workspace + Stripe period columns.

Revision ID: pr01_billing_subscriptions_workspace
Revises: blk02_crm_ws_notnull
Create Date: 2026-04-17

Adds workspace_id (backfilled), stripe_customer_id, current_period_start/end.
Backfill policy matches blk01: owned workspace first, else active membership.
expires_at remains; current_period_end backfilled from expires_at when null.

Upgrade fails if any subscription row cannot resolve workspace_id.
Downgrade drops new constraints/columns (destructive if data relied on new fields).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision: str = "pr01_billing_subscriptions_workspace"
down_revision: Union[str, Sequence[str], None] = "blk02_crm_ws_notnull"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "subscriptions",
        sa.Column("workspace_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        text("""
            UPDATE subscriptions AS s
            SET workspace_id = (
                SELECT COALESCE(
                    (SELECT w.id FROM workspaces w
                     WHERE w.user_id = s.user_id
                     ORDER BY w.id ASC LIMIT 1),
                    (SELECT wm.workspace_id FROM workspace_members wm
                     WHERE wm.user_id = s.user_id AND wm.status = 'active'
                     ORDER BY wm.workspace_id ASC LIMIT 1)
                )
            )
            WHERE s.workspace_id IS NULL
        """)
    )

    op.execute(
        text("""
            UPDATE subscriptions
            SET current_period_end = expires_at
            WHERE current_period_end IS NULL AND expires_at IS NOT NULL
        """)
    )

    conn = op.get_bind()
    r = conn.execute(text("SELECT COUNT(*) FROM subscriptions WHERE workspace_id IS NULL"))
    n = r.scalar()
    if n and int(n) > 0:
        raise RuntimeError(
            f"Cannot set NOT NULL on subscriptions.workspace_id: {n} rows still NULL. "
            "Fix data (workspaces / workspace_members) or assign manually, then re-run."
        )

    op.alter_column(
        "subscriptions",
        "workspace_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.create_foreign_key(
        "fk_subscriptions_workspace_id_workspaces",
        "subscriptions",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_index(
        "ix_subscriptions_workspace_id",
        "subscriptions",
        ["workspace_id"],
        unique=False,
    )

    if conn.dialect.name == "postgresql":
        op.execute(
            text("""
                CREATE UNIQUE INDEX uq_subscriptions_stripe_subscription_id_nonnull
                ON subscriptions (stripe_subscription_id)
                WHERE stripe_subscription_id IS NOT NULL
            """)
        )


def downgrade() -> None:
    conn = op.get_bind()

    if conn.dialect.name == "postgresql":
        op.execute(text("DROP INDEX IF EXISTS uq_subscriptions_stripe_subscription_id_nonnull"))

    op.drop_index("ix_subscriptions_workspace_id", table_name="subscriptions")
    op.drop_constraint(
        "fk_subscriptions_workspace_id_workspaces",
        "subscriptions",
        type_="foreignkey",
    )

    op.drop_column("subscriptions", "current_period_end")
    op.drop_column("subscriptions", "current_period_start")
    op.drop_column("subscriptions", "stripe_customer_id")
    op.drop_column("subscriptions", "workspace_id")
