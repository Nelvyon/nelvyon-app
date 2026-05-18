"""CRM workspace_id backfill (nullable columns unchanged).

Revision ID: blk01_crm_ws_backfill
Revises: 332bcaa1998a
Create Date: 2026-04-17

Policy (in order):
1) workspace owned by row.user_id: MIN(workspaces.id) for that user_id
2) else active membership: MIN(workspace_members.workspace_id) for that user_id

Rows that cannot be resolved remain NULL for manual review before applying NOT NULL migration.
Downgrade: cannot safely restore previous NULL pattern; no-op.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision: str = "blk01_crm_ws_backfill"
down_revision: Union[str, Sequence[str], None] = "332bcaa1998a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables with workspace_id used by MVP CRM routers
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


def _backfill_table_sql(table: str) -> str:
    return f"""
    UPDATE {table}
    SET workspace_id = (
        SELECT COALESCE(
            (SELECT w.id FROM workspaces w
             WHERE w.user_id = {table}.user_id
             ORDER BY w.id ASC LIMIT 1),
            (SELECT wm.workspace_id FROM workspace_members wm
             WHERE wm.user_id = {table}.user_id AND wm.status = 'active'
             ORDER BY wm.workspace_id ASC LIMIT 1)
        )
    )
    WHERE {table}.workspace_id IS NULL
    """


def upgrade() -> None:
    for table in TABLES:
        op.execute(text(_backfill_table_sql(table)))


def downgrade() -> None:
    """Backfill is not reversible without a prior snapshot of workspace_id."""
    pass
