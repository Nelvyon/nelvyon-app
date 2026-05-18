"""
NELVYON master roadmap — Fase 1: CRM (deals, pipeline_deals, pipeline_pro) +
workflow_engine (reglas + trigger/execute) con workspace, operator y plan_quota.
"""
import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def _restore_ws1_starter(db_session: AsyncSession) -> None:
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_deals_put_member_forbidden_operator(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-D-{suf}", "stage": "lead"},
    )
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    u = await client.put(
        f"/api/v1/entities/deals/{did}",
        headers=member_headers,
        json={"title": "x"},
    )
    assert u.status_code == 403
    assert "operator" in (u.json().get("detail") or "").lower()
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_deals_put_cross_workspace_404(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-X-{suf}", "stage": "lead"},
    )
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    u = await client.put(
        f"/api/v1/entities/deals/{did}",
        headers=admin_headers,
        json={"title": "wrong"},
    )
    assert u.status_code == 404
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_deals_put_partner_plan_blocks_contacts_module(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-PRE-{suf}", "stage": "lead"},
    )
    assert cr.status_code == 201, cr.text
    did = cr.json()["id"]
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
    u = await client.put(
        f"/api/v1/entities/deals/{did}",
        headers=auth_headers,
        json={"title": f"P1-PART-{suf}"},
    )
    assert u.status_code == 403
    d = (u.json().get("detail") or "").lower()
    assert "contactos" in d or "crm" in d or "plan" in d
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_deals_batch_update_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-BU-{suf}", "stage": "lead"},
    )
    assert cr.status_code == 201, cr.text
    did = cr.json()["id"]
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
    bu = await client.put(
        "/api/v1/entities/deals/batch",
        headers=auth_headers,
        json={"items": [{"id": did, "updates": {"title": "blocked"}}]},
    )
    assert bu.status_code == 403
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_deals_batch_delete_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    a = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-DL-A-{suf}", "stage": "lead"},
    )
    b = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-DL-B-{suf}", "stage": "lead"},
    )
    assert a.status_code == 201 and b.status_code == 201
    id_a, id_b = a.json()["id"], b.json()["id"]
    h = {**auth_headers, "Content-Type": "application/json"}
    bd = await client.request(
        "DELETE",
        "/api/v1/entities/deals/batch",
        headers=h,
        content=json.dumps({"ids": [id_a, id_b]}),
    )
    assert bd.status_code == 200, bd.text
    assert bd.json().get("deleted_count") == 2


@pytest.mark.asyncio
async def test_phase1_pipeline_deals_post_member_forbidden(
    client: AsyncClient, member_headers: dict
):
    r = await client.post(
        "/api/v1/entities/pipeline_deals",
        headers=member_headers,
        json={"name": "x", "stage": "lead"},
    )
    assert r.status_code == 403
    assert "operator" in (r.json().get("detail") or "").lower()


@pytest.mark.asyncio
async def test_phase1_pipeline_deals_post_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
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
        "/api/v1/entities/pipeline_deals",
        headers=auth_headers,
        json={"name": f"P1-PD-{uuid4().hex[:8]}", "stage": "lead"},
    )
    assert r.status_code == 403
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_pipeline_deals_batch_create_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/pipeline_deals/batch",
        headers=auth_headers,
        json={
            "items": [
                {"name": f"P1-PDB1-{suf}", "stage": "lead"},
                {"name": f"P1-PDB2-{suf}", "stage": "lead"},
            ]
        },
    )
    assert r.status_code == 201, r.text
    assert len(r.json()) == 2
    for row in r.json():
        await db_session.execute(
            text("DELETE FROM pipeline_deals WHERE id = :i"), {"i": row["id"]}
        )
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_pipeline_pro_stage_change_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    d = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-ST-{suf}", "stage": "lead"},
    )
    assert d.status_code == 201, d.text
    did = d.json()["id"]
    sc = await client.post(
        f"/api/v1/pipeline/deals/{did}/stage-change",
        headers=member_headers,
        json={"new_stage": "qualified"},
    )
    assert sc.status_code == 403
    assert "operator" in (sc.json().get("detail") or "").lower()
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_pipeline_pro_stage_change_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    d = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-SCP-{suf}", "stage": "lead"},
    )
    assert d.status_code == 201, d.text
    did = d.json()["id"]
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
    sc = await client.post(
        f"/api/v1/pipeline/deals/{did}/stage-change",
        headers=auth_headers,
        json={"new_stage": "qualified"},
    )
    assert sc.status_code == 403
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_pipeline_pro_activity_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    d = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-ACT-{suf}", "stage": "lead"},
    )
    assert d.status_code == 201, d.text
    did = d.json()["id"]
    a = await client.post(
        f"/api/v1/pipeline/deals/{did}/activities",
        headers=auth_headers,
        json={"type": "note", "title": "t1"},
    )
    assert a.status_code == 201, a.text
    aid = a.json()["id"]
    await db_session.execute(text("DELETE FROM activities WHERE id = :i"), {"i": aid})
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_workflow_engine_create_rule_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
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
        "/api/v1/workflow-engine/rules",
        headers=auth_headers,
        json={
            "name": f"P1-RULE-{uuid4().hex[:8]}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "action_config": '{"title": "x"}',
        },
    )
    assert r.status_code == 403
    d = (r.json().get("detail") or "").lower()
    assert "workflow" in d or "plan" in d
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_workflow_engine_trigger_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    await client.post(
        "/api/v1/workflow-engine/rules",
        headers=auth_headers,
        json={
            "name": f"P1-TRIG-P-{uuid4().hex[:8]}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "action_config": '{"title": "n"}',
            "is_active": True,
        },
    )
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
    tr = await client.post(
        "/api/v1/workflow-engine/trigger",
        headers=auth_headers,
        json={"trigger_type": "manual", "trigger_data": {}},
    )
    assert tr.status_code == 403
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_workflow_engine_trigger_happy_operator(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    await client.post(
        "/api/v1/workflow-engine/rules",
        headers=auth_headers,
        json={
            "name": f"P1-TR-OK-{suf}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "action_config": '{"title": "hello"}',
            "is_active": True,
        },
    )
    tr = await client.post(
        "/api/v1/workflow-engine/trigger",
        headers=auth_headers,
        json={"trigger_type": "manual", "trigger_data": {}},
    )
    assert tr.status_code == 200, tr.text
    assert tr.json().get("triggered", 0) >= 1


@pytest.mark.asyncio
async def test_phase1_deals_delete_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-DEL-M-{suf}", "stage": "lead"},
    )
    assert r.status_code == 201, r.text
    did = r.json()["id"]
    d = await client.delete(f"/api/v1/entities/deals/{did}", headers=member_headers)
    assert d.status_code == 403
    assert "operator" in (d.json().get("detail") or "").lower()
    await client.delete(f"/api/v1/entities/deals/{did}", headers=auth_headers)


@pytest.mark.asyncio
async def test_phase1_workflow_put_delete_rule_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/workflow-engine/rules",
        headers=auth_headers,
        json={
            "name": f"P1-RU-{suf}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "action_config": '{"title": "x"}',
        },
    )
    assert cr.status_code == 201, cr.text
    rid = cr.json()["id"]
    pu = await client.put(
        f"/api/v1/workflow-engine/rules/{rid}",
        headers=member_headers,
        json={"name": "blocked"},
    )
    assert pu.status_code == 403
    de = await client.delete(f"/api/v1/workflow-engine/rules/{rid}", headers=member_headers)
    assert de.status_code == 403
    await client.delete(f"/api/v1/workflow-engine/rules/{rid}", headers=auth_headers)


@pytest.mark.asyncio
async def test_phase1_workflow_execute_partner_blocks(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    uid = "test-user-00000000-0000-0000-0000-000000000001"
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/workflow-engine/rules",
        headers=auth_headers,
        json={
            "name": f"P1-EX-{suf}",
            "trigger_type": "manual",
            "action_type": "create_notification",
            "action_config": '{"title": "n"}',
            "is_active": True,
        },
    )
    assert cr.status_code == 201, cr.text
    rid = cr.json()["id"]
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
    ex = await client.post(
        f"/api/v1/workflow-engine/execute/{rid}",
        headers=auth_headers,
        json={},
    )
    assert ex.status_code == 403
    await db_session.execute(text("DELETE FROM subscriptions WHERE workspace_id = 1"))
    await db_session.commit()
    await client.delete(f"/api/v1/workflow-engine/rules/{rid}", headers=auth_headers)


@pytest.mark.asyncio
async def test_phase1_pipeline_deals_put_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    cr = await client.post(
        "/api/v1/entities/pipeline_deals",
        headers=auth_headers,
        json={"name": f"P1-PDPU-{suf}", "stage": "lead"},
    )
    assert cr.status_code == 201, cr.text
    pid = cr.json()["id"]
    pu = await client.put(
        f"/api/v1/entities/pipeline_deals/{pid}",
        headers=member_headers,
        json={"name": "x"},
    )
    assert pu.status_code == 403
    await db_session.execute(
        text("DELETE FROM pipeline_deals WHERE id = :i"), {"i": pid}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_phase1_pipeline_pro_activity_toggle_member_forbidden(
    client: AsyncClient, auth_headers: dict, member_headers: dict, db_session: AsyncSession
):
    await _restore_ws1_starter(db_session)
    suf = uuid4().hex[:8]
    d = await client.post(
        "/api/v1/entities/deals",
        headers=auth_headers,
        json={"title": f"P1-TG-{suf}", "stage": "lead"},
    )
    assert d.status_code == 201, d.text
    did = d.json()["id"]
    a = await client.post(
        f"/api/v1/pipeline/deals/{did}/activities",
        headers=auth_headers,
        json={"type": "note", "title": "t1"},
    )
    assert a.status_code == 201, a.text
    aid = a.json()["id"]
    tg = await client.put(
        f"/api/v1/pipeline/activities/{aid}/toggle",
        headers=member_headers,
    )
    assert tg.status_code == 403
    await db_session.execute(text("DELETE FROM activities WHERE id = :i"), {"i": aid})
    await db_session.execute(text("DELETE FROM deals WHERE id = :i"), {"i": did})
    await db_session.commit()
