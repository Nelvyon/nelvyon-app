"""Fase 1C — conteo hybrid saas_contacts + legacy para cuotas y métricas."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.saas_contact_quota import (
    count_contacts_breakdown,
    count_contacts_for_workspace,
    count_contacts_leads_hybrid,
    contacts_count_source_label,
)

UID = "test-user-00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio
async def test_hybrid_uses_max_of_legacy_when_no_saas_tables(db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM contacts WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM crm_contacts WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO contacts (user_id, workspace_id, first_name, email, status, created_at, updated_at)
            VALUES (:uid, 1, 'A', 'a@test.com', 'lead', :ts, :ts),
                   (:uid, 1, 'B', 'b@test.com', 'client', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    total = await count_contacts_for_workspace(db_session, 1, mode="hybrid")
    assert total == 2
    breakdown = await count_contacts_breakdown(db_session, 1)
    assert breakdown["legacy"] == 2
    assert breakdown["hybrid"] == 2
    assert contacts_count_source_label(breakdown["saas"], breakdown["legacy"]) == "legacy"


@pytest.mark.asyncio
async def test_hybrid_leads_count_legacy(db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM contacts WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM crm_contacts WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO contacts (user_id, workspace_id, first_name, email, status, created_at, updated_at)
            VALUES (:uid, 1, 'L1', 'l1@test.com', 'lead', :ts, :ts),
                   (:uid, 1, 'L2', 'l2@test.com', 'lead', :ts, :ts),
                   (:uid, 1, 'C1', 'c1@test.com', 'client', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    leads = await count_contacts_leads_hybrid(db_session, 1)
    assert leads == 2


@pytest.mark.asyncio
async def test_plan_quota_delegates_to_hybrid(db_session: AsyncSession):
    from services.plan_quota import count_contacts_in_workspace

    now = datetime.now(timezone.utc)
    await db_session.execute(text("DELETE FROM contacts WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM crm_contacts WHERE workspace_id = 1"))
    await db_session.commit()
    await db_session.execute(
        text(
            """
            INSERT INTO contacts (user_id, workspace_id, first_name, email, created_at, updated_at)
            VALUES (:uid, 1, 'Q', 'q@test.com', :ts, :ts)
            """
        ),
        {"uid": UID, "ts": now},
    )
    await db_session.commit()

    n = await count_contacts_in_workspace(db_session, 1)
    assert n == 1
