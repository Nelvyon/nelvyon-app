"""
Database Index Migration — Performance Optimization for Production Scale.

Adds critical indexes for:
- CRM: contacts email lookup, search, deals pipeline queries
- Helpdesk: ticket priority + status for SLA queries
- Contracts: status workflow queries
- Activities: contact timeline queries
- Conversations: contact lookup + status filtering

Run: python -m migrations.add_indexes
"""
import asyncio
import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import db_manager

logger = logging.getLogger(__name__)

# Index definitions: (index_name, table, columns, unique, partial_condition)
INDEXES = [
    # ── CRM: Contacts ──
    ("idx_contacts_email_lower", "contacts", "LOWER(email)", False, None),
    ("idx_contacts_user_workspace", "contacts", "user_id, workspace_id", False, None),
    ("idx_contacts_status", "contacts", "status", False, None),
    ("idx_contacts_source", "contacts", "source", False, None),
    ("idx_contacts_company", "contacts", "company_name", False, None),
    ("idx_contacts_score", "contacts", "score DESC NULLS LAST", False, None),
    ("idx_contacts_created_at", "contacts", "created_at DESC", False, None),
    ("idx_contacts_search_composite", "contacts", "user_id, workspace_id, status, source", False, None),

    # ── CRM: Deals ──
    ("idx_deals_contact_id", "deals", "contact_id", False, None),
    ("idx_deals_user_workspace", "deals", "user_id, workspace_id", False, None),
    ("idx_deals_stage", "deals", "stage", False, None),
    ("idx_deals_pipeline_stage", "deals", "pipeline, stage", False, None),
    ("idx_deals_value", "deals", "value DESC NULLS LAST", False, None),
    ("idx_deals_expected_close", "deals", "expected_close", False, None),
    ("idx_deals_client_id", "deals", "client_id", False, "client_id IS NOT NULL"),
    ("idx_deals_project_id", "deals", "project_id", False, "project_id IS NOT NULL"),

    # ── Activities ──
    ("idx_activities_contact_id", "activities", "contact_id", False, None),
    ("idx_activities_deal_id", "activities", "deal_id", False, None),
    ("idx_activities_user_workspace", "activities", "user_id, workspace_id", False, None),
    ("idx_activities_due_date", "activities", "due_date", False, "due_date IS NOT NULL"),
    ("idx_activities_pending", "activities", "user_id, is_completed, due_date", False, None),

    # ── Conversations ──
    ("idx_conversations_contact_id", "conversations", "contact_id", False, None),
    ("idx_conversations_user_workspace", "conversations", "user_id, workspace_id", False, None),
    ("idx_conversations_status", "conversations", "status", False, None),
    ("idx_conversations_last_msg", "conversations", "last_message_at DESC NULLS LAST", False, None),

    # ── Contracts ──
    ("idx_contracts_user_workspace", "contracts", "user_id, workspace_id", False, None),
    ("idx_contracts_status", "contracts", "status", False, None),
    ("idx_contracts_client_id", "contracts", "client_id", False, "client_id IS NOT NULL"),
    ("idx_contracts_project_id", "contracts", "project_id", False, "project_id IS NOT NULL"),

    # ── Helpdesk Tickets ──
    ("idx_helpdesk_user_workspace", "helpdesk_tickets", "user_id, workspace_id", False, None),
    ("idx_helpdesk_priority_status", "helpdesk_tickets", "priority, status", False, None),
    ("idx_helpdesk_assigned_to", "helpdesk_tickets", "assigned_to", False, None),
    ("idx_helpdesk_created_at", "helpdesk_tickets", "created_at DESC", False, None),

    # ── Security Events (audit trail) ──
    ("idx_security_events_user", "security_events", "user_id", False, None),
    ("idx_security_events_type", "security_events", "event_type", False, None),
    ("idx_security_events_created", "security_events", "created_at DESC", False, None),

    # ── Campaigns ──
    ("idx_campaigns_user_workspace", "campaigns", "user_id, workspace_id", False, None),
    ("idx_campaigns_status", "campaigns", "status", False, None),
]


async def check_index_exists(conn, index_name: str) -> bool:
    """Check if an index already exists (PostgreSQL)."""
    result = await conn.execute(
        text("SELECT 1 FROM pg_indexes WHERE indexname = :name"),
        {"name": index_name},
    )
    return result.scalar() is not None


async def check_table_exists(conn, table_name: str) -> bool:
    """Check if a table exists."""
    result = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name"
        ),
        {"name": table_name},
    )
    return result.scalar() is not None


async def run_migration():
    """Apply all indexes idempotently."""
    await db_manager.init_db()

    created = 0
    skipped = 0
    errors = 0

    async with db_manager.engine.begin() as conn:
        for idx_name, table, columns, unique, condition in INDEXES:
            try:
                # Check table exists
                if not await check_table_exists(conn, table):
                    logger.info(f"⏭️  Table '{table}' does not exist, skipping {idx_name}")
                    skipped += 1
                    continue

                # Check index exists
                if await check_index_exists(conn, idx_name):
                    logger.debug(f"⏭️  Index {idx_name} already exists")
                    skipped += 1
                    continue

                # Build CREATE INDEX statement
                unique_str = "UNIQUE " if unique else ""
                sql = f"CREATE {unique_str}INDEX CONCURRENTLY IF NOT EXISTS {idx_name} ON {table} ({columns})"
                if condition:
                    sql += f" WHERE {condition}"

                # CONCURRENTLY cannot run inside a transaction, so we use a separate connection
                # For safety in migration scripts, we'll use regular CREATE INDEX
                sql_safe = sql.replace(" CONCURRENTLY", "")
                await conn.execute(text(sql_safe))
                created += 1
                logger.info(f"✅ Created index: {idx_name} ON {table}({columns})")

            except Exception as e:
                errors += 1
                logger.warning(f"⚠️  Failed to create {idx_name}: {e}")

    await db_manager.close_db()

    print(f"\n{'='*60}")
    print(f"Index Migration Complete")
    print(f"  Created: {created}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors:  {errors}")
    print(f"{'='*60}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_migration())