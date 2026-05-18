"""CRM workspace_id NOT NULL (run only after blk01 + verification of zero NULLs).

Revision ID: blk02_crm_ws_notnull
Revises: blk01_crm_ws_backfill
Create Date: 2026-04-17

Upgrade fails if any NULL workspace_id remains on listed tables.
Downgrade restores nullable=True.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision: str = "blk02_crm_ws_notnull"
down_revision: Union[str, Sequence[str], None] = "blk01_crm_ws_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "contacts",
    "deals",
    "pipeline_deals",
    "helpdesk_tickets",
    "campaigns",
    "conversations",
    "workflows",
    "activities",
)


def upgrade() -> None:
    conn = op.get_bind()
    for table in TABLES:
        r = conn.execute(
            text(f"SELECT COUNT(*) AS c FROM {table} WHERE workspace_id IS NULL")
        )
        n = r.scalar()
        if n and int(n) > 0:
            raise RuntimeError(
                f"Cannot set NOT NULL on {table}.workspace_id: {n} rows still NULL. "
                "Fix data or extend backfill, then re-run."
            )

    for table in TABLES:
        op.alter_column(
            table,
            "workspace_id",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade() -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "workspace_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
