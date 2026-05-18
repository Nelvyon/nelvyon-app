"""
NELVYON-REMEDIATION-1 FASE 2 — enforcement de plan + tenancy/RBAC en contactos/campañas/workflows.
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import text


@pytest.mark.asyncio
async def test_partner_active_plan_blocks_contact_create(
    client: AsyncClient, auth_headers: dict, db_session
):
    """Plan partner: módulo contactos false → 403."""
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(
        text(
            """
            INSERT INTO subscriptions (
                user_id, workspace_id, plan_id, billing_cycle, status,
                created_at, updated_at
            ) VALUES (
                :uid, 1, 'partner', 'monthly', 'active',
                :now, :now
            )
            """
        ),
        {"uid": uid, "now": datetime.now(timezone.utc)},
    )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/contacts",
        headers=auth_headers,
        json={
            "first_name": "P",
            "last_name": "Q",
            "email": "partner-block@test.com",
        },
    )
    assert r.status_code == 403
    assert "contactos" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_starter_workflow_active_limit_blocks_create(
    client: AsyncClient, admin_headers: dict, db_session
):
    """Starter: 10 workflows activos → el 11º create devuelve 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    for i in range(10):
        await db_session.execute(
            text(
                """
                INSERT INTO workflows (
                    user_id, workspace_id, name, trigger_type, status, created_at
                ) VALUES (
                    :uid, 2, :name, 'manual', 'active', :now
                )
                """
            ),
            {"uid": admin_uid, "name": f"quota_wf_{i}", "now": datetime.now(timezone.utc)},
        )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/workflows",
        headers=admin_headers,
        json={"name": "eleventh", "trigger_type": "manual", "status": "active"},
    )
    assert r.status_code == 403
    assert "workflow" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_starter_campaign_non_terminal_limit_blocks_create(
    client: AsyncClient, admin_headers: dict, db_session
):
    """Starter: 10 campañas no terminales → la 11ª create devuelve 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    for i in range(10):
        await db_session.execute(
            text(
                """
                INSERT INTO campaigns (
                    user_id, workspace_id, name, type, status, created_at
                ) VALUES (
                    :uid, 2, :name, 'email', 'draft', :now
                )
                """
            ),
            {"uid": admin_uid, "name": f"quota_camp_{i}", "now": datetime.now(timezone.utc)},
        )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/campaigns",
        headers=admin_headers,
        json={"name": "eleventh", "type": "email", "status": "draft"},
    )
    assert r.status_code == 403
    assert "campañas" in r.json().get("detail", "").lower() or "campa" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_contact_create_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    """Member sin rol operator no crea contactos (RBAC existente)."""
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=member_headers,
        json={
            "first_name": "M",
            "last_name": "R",
            "email": "member-no-create@test.com",
        },
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_contact_create_wrong_workspace_header_forbidden(client: AsyncClient, auth_headers: dict):
    """Owner ws1 no puede usar X-Workspace-Id=2 (cross-tenant)."""
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/entities/contacts",
        headers=bad,
        json={
            "first_name": "X",
            "last_name": "Y",
            "email": "cross-ws@test.com",
        },
    )
    assert r.status_code == 403
