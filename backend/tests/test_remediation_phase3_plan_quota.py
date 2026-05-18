"""
NELVYON-REMEDIATION-1 FASE 3 — cuotas en batch/import/reactivación + RBAC/tenant en subconjunto remediado.
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import text


@pytest.mark.asyncio
async def test_partner_plan_blocks_contact_batch(client: AsyncClient, auth_headers: dict, db_session):
    """Plan partner sin módulo contactos → POST /contacts/batch 403."""
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
        "/api/v1/entities/contacts/batch",
        headers=auth_headers,
        json={
            "items": [
                {
                    "first_name": "B",
                    "last_name": "1",
                    "email": "batch-partner@test.com",
                }
            ]
        },
    )
    assert r.status_code == 403
    assert "contactos" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_contact_batch_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    """Member → batch contactos 403 (operator)."""
    r = await client.post(
        "/api/v1/entities/contacts/batch",
        headers=member_headers,
        json={
            "items": [
                {
                    "first_name": "M",
                    "email": "batch-member@test.com",
                }
            ]
        },
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_contact_batch_cross_workspace_forbidden(client: AsyncClient, auth_headers: dict):
    """Owner ws1 + header ws2 → 403."""
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/entities/contacts/batch",
        headers=bad,
        json={"items": [{"first_name": "X", "email": "cross-batch@test.com"}]},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_starter_campaign_batch_exceeds_non_terminal_limit(
    client: AsyncClient, admin_headers: dict, db_session
):
    """10 campañas no terminales + batch create 2 → 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
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
            {"uid": admin_uid, "name": f"q3_camp_{i}", "now": now},
        )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/campaigns/batch",
        headers=admin_headers,
        json={
            "items": [
                {"name": "b1", "type": "email", "status": "draft"},
                {"name": "b2", "type": "email", "status": "draft"},
            ]
        },
    )
    assert r.status_code == 403
    assert "campañas" in r.json().get("detail", "").lower() or "campa" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_starter_workflow_batch_exceeds_active_limit(
    client: AsyncClient, admin_headers: dict, db_session
):
    """10 workflows active + batch 2 active → 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
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
            {"uid": admin_uid, "name": f"q3_wf_{i}", "now": now},
        )
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/workflows/batch",
        headers=admin_headers,
        json={
            "items": [
                {"name": "ba1", "trigger_type": "manual", "status": "active"},
                {"name": "ba2", "trigger_type": "manual", "status": "active"},
            ]
        },
    )
    assert r.status_code == 403
    assert "workflow" in r.json().get("detail", "").lower()

    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_starter_workflow_activate_blocked_at_limit(
    client: AsyncClient, admin_headers: dict, db_session
):
    """10 active + 1 paused; activar el paused → 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
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
            {"uid": admin_uid, "name": f"act_wf_{i}", "now": now},
        )
    await db_session.execute(
        text(
            """
            INSERT INTO workflows (
                user_id, workspace_id, name, trigger_type, status, created_at
            ) VALUES (
                :uid, 2, 'paused_one', 'manual', 'paused', :now
            )
            """
        ),
        {"uid": admin_uid, "now": now},
    )
    await db_session.commit()

    r_id = await db_session.execute(
        text("SELECT id FROM workflows WHERE workspace_id = 2 AND name = 'paused_one'")
    )
    row = r_id.fetchone()
    assert row
    wid = row[0]

    r = await client.put(
        f"/api/v1/entities/workflows/{wid}",
        headers=admin_headers,
        json={"status": "active"},
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_starter_campaign_reopen_terminal_blocked_at_limit(
    client: AsyncClient, admin_headers: dict, db_session
):
    """10 draft + 1 sent; reabrir sent a draft → 11 no terminales → 403."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()

    admin_uid = "admin-user-00000000-0000-0000-0000-000000000001"
    now = datetime.now(timezone.utc)
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
            {"uid": admin_uid, "name": f"reopen_d_{i}", "now": now},
        )
    await db_session.execute(
        text(
            """
            INSERT INTO campaigns (
                user_id, workspace_id, name, type, status, created_at
            ) VALUES (
                :uid, 2, 'reopen_sent_one', 'email', 'sent', :now
            )
            """
        ),
        {"uid": admin_uid, "now": now},
    )
    await db_session.commit()

    r_id = await db_session.execute(
        text("SELECT id FROM campaigns WHERE workspace_id = 2 AND name = 'reopen_sent_one'")
    )
    row = r_id.fetchone()
    assert row
    cid = row[0]

    r = await client.put(
        f"/api/v1/entities/campaigns/{cid}",
        headers=admin_headers,
        json={"status": "draft"},
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_csv_import_partner_blocks_contacts(client: AsyncClient, auth_headers: dict, db_session):
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
        "/api/v1/crm/import-csv",
        headers=auth_headers,
        json={
            "rows": [{"first_name": "I", "email": "csv-partner@test.com"}],
            "skip_duplicates": True,
        },
    )
    assert r.status_code == 403

    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_csv_import_member_forbidden_operator(client: AsyncClient, member_headers: dict):
    r = await client.post(
        "/api/v1/crm/import-csv",
        headers=member_headers,
        json={
            "rows": [{"first_name": "M", "email": "csv-mem@test.com"}],
            "skip_duplicates": True,
        },
    )
    assert r.status_code == 403
    assert "operator" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_csv_import_cross_workspace_forbidden(client: AsyncClient, auth_headers: dict):
    bad = {**auth_headers, "X-Workspace-Id": "2"}
    r = await client.post(
        "/api/v1/crm/import-csv",
        headers=bad,
        json={"rows": [{"first_name": "X", "email": "csv-cross@test.com"}], "skip_duplicates": True},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_csv_import_happy_path(client: AsyncClient, admin_headers: dict, db_session):
    """Import mínimo bajo starter (ws2)."""
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()

    email = f"csv_ok_{datetime.now(timezone.utc).timestamp()}@test.com"
    r = await client.post(
        "/api/v1/crm/import-csv",
        headers=admin_headers,
        json={
            "rows": [{"first_name": "Ok", "email": email}],
            "skip_duplicates": True,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("imported", 0) >= 1

    await db_session.execute(
        text("DELETE FROM contacts WHERE workspace_id = 2 AND email = :e"), {"e": email}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_contact_batch_happy_under_quota(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.commit()
    email = f"batch_ok_{datetime.now(timezone.utc).timestamp()}@test.com"
    r = await client.post(
        "/api/v1/entities/contacts/batch",
        headers=admin_headers,
        json={"items": [{"first_name": "B", "email": email}]},
    )
    assert r.status_code == 201
    assert len(r.json()) == 1

    await db_session.execute(
        text("DELETE FROM contacts WHERE workspace_id = 2 AND email = :e"), {"e": email}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_campaign_batch_happy_one_item(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM campaigns WHERE workspace_id = 2"))
    await db_session.commit()

    name = f"happy_batch_{datetime.now(timezone.utc).timestamp()}"
    r = await client.post(
        "/api/v1/entities/campaigns/batch",
        headers=admin_headers,
        json={"items": [{"name": name, "type": "email", "status": "draft"}]},
    )
    assert r.status_code == 201
    assert len(r.json()) == 1

    await db_session.execute(
        text("DELETE FROM campaigns WHERE workspace_id = 2 AND name = :n"), {"n": name}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_workflow_batch_happy_one_paused(client: AsyncClient, admin_headers: dict, db_session):
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 2"))
    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()

    r = await client.post(
        "/api/v1/entities/workflows/batch",
        headers=admin_headers,
        json={
            "items": [
                {"name": "h1", "trigger_type": "manual", "status": "paused"},
            ]
        },
    )
    assert r.status_code == 201
    assert len(r.json()) == 1

    await db_session.execute(text("DELETE FROM workflows WHERE workspace_id = 2"))
    await db_session.commit()
