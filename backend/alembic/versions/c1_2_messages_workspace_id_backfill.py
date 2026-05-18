"""Backfill messages.workspace_id from conversations and enforce NOT NULL.

Revision ID: c1_2_messages_workspace_backfill
Revises: pr03_onboarding_progress
Create Date: 2026-04-20

Policy for corrupt rows:
- If a message points to a non-existent conversation, it is deleted.
  Reason: no canonical workspace can be derived; keeping it would violate
  tenant consistency and remain permanently invisible in workspace-scoped reads.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision: str = "c1_2_messages_workspace_backfill"
down_revision: Union[str, Sequence[str], None] = "pr03_onboarding_progress"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Backfill NULL workspace_id from parent conversation workspace.
    conn.execute(
        text(
            """
            UPDATE messages
            SET workspace_id = (
                SELECT c.workspace_id
                FROM conversations c
                WHERE c.id = messages.conversation_id
            )
            WHERE messages.workspace_id IS NULL
              AND EXISTS (
                SELECT 1
                FROM conversations c
                WHERE c.id = messages.conversation_id
              )
            """
        )
    )

    # Remove orphan rows with no parent conversation (data corruption).
    conn.execute(
        text(
            """
            DELETE FROM messages
            WHERE workspace_id IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM conversations c
                WHERE c.id = messages.conversation_id
              )
            """
        )
    )

    remaining_nulls = conn.execute(
        text("SELECT COUNT(*) FROM messages WHERE workspace_id IS NULL")
    ).scalar()
    if remaining_nulls and int(remaining_nulls) > 0:
        raise RuntimeError(
            f"messages.workspace_id still NULL for {remaining_nulls} rows after backfill; aborting NOT NULL"
        )

    op.alter_column(
        "messages",
        "workspace_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "messages",
        "workspace_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
