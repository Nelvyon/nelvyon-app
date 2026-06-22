"""Billing PR#1: subscriptions workspace_id + current_period_start (idempotent).

Revision ID: pr01_billing_subscriptions_workspace
Revises: blk02_crm_ws_notnull
Create Date: 2026-04-17
Fixed: 2026-06-22 — use raw SQL IF NOT EXISTS to avoid DuplicateColumn on prod.
stripe_customer_id and current_period_end already exist; workspace_id is nullable
(no FK / NOT NULL) because early-prod rows have no workspace data yet.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "pr01_billing_subscriptions_workspace"
down_revision: Union[str, Sequence[str], None] = "blk02_crm_ws_notnull"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # All ADD COLUMN via raw SQL with IF NOT EXISTS — safe on prod where some columns exist
    conn.execute(text(
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workspace_id INTEGER"
    ))
    conn.execute(text(
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT"
    ))
    conn.execute(text(
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ"
    ))
    conn.execute(text(
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ"
    ))

    # Backfill current_period_end from expires_at
    conn.execute(text("""
        UPDATE subscriptions
        SET current_period_end = expires_at
        WHERE current_period_end IS NULL AND expires_at IS NOT NULL
    """))

    # Backfill current_period_start from created_at
    conn.execute(text("""
        UPDATE subscriptions
        SET current_period_start = created_at
        WHERE current_period_start IS NULL AND created_at IS NOT NULL
    """))

    # workspace_id backfill (best-effort, stays nullable)
    conn.execute(text("""
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
    """))

    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_subscriptions_workspace_id
        ON subscriptions(workspace_id)
    """))

    if conn.dialect.name == "postgresql":
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_stripe_subscription_id_nonnull
            ON subscriptions (stripe_subscription_id)
            WHERE stripe_subscription_id IS NOT NULL
        """))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        conn.execute(text(
            "DROP INDEX IF EXISTS uq_subscriptions_stripe_subscription_id_nonnull"
        ))
    conn.execute(text("DROP INDEX IF EXISTS ix_subscriptions_workspace_id"))
    conn.execute(text(
        "ALTER TABLE subscriptions DROP COLUMN IF EXISTS workspace_id"
    ))
    conn.execute(text(
        "ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_period_start"
    ))
