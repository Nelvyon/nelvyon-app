from unittest.mock import AsyncMock, patch

import pytest

from models.contracts import Contracts
from models.nelvyon_outputs import Nelvyon_outputs


@pytest.mark.asyncio
async def test_contract_signing_prepare_member_forbidden(client, member_headers):
    resp = await client.post(
        "/api/v1/contracts/signing/prepare",
        json={"contract_id": 9999},
        headers=member_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_contract_signing_prepare_cross_workspace_rejected(client, auth_headers, db_session):
    db_session.add(
        Contracts(
            user_id="test-user-00000000-0000-0000-0000-000000000001",
            workspace_id=2,
            title="cross-ws",
            content="content",
            status="draft",
        )
    )
    await db_session.commit()
    row = (await db_session.execute(Contracts.__table__.select().order_by(Contracts.id.desc()))).first()

    resp = await client.post(
        "/api/v1/contracts/signing/prepare",
        json={"contract_id": row.id},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_contract_signing_prepare_happy_path(client, auth_headers, db_session):
    contract = Contracts(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=1,
        title="ok-ws",
        content="valid contract body",
        status="draft",
    )
    db_session.add(contract)
    await db_session.commit()
    await db_session.refresh(contract)

    resp = await client.post(
        "/api/v1/contracts/signing/prepare",
        json={"contract_id": contract.id},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"


@pytest.mark.asyncio
async def test_platform_metrics_create_admin_ok(client, admin_headers):
    resp = await client.post(
        "/api/v1/entities/platform_metrics",
        json={
            "user_id": "admin-user-00000000-0000-0000-0000-000000000001",
            "metric_type": "latency",
            "module_name": "qa",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_platform_metrics_create_member_forbidden(client, member_headers):
    resp = await client.post(
        "/api/v1/entities/platform_metrics",
        json={"user_id": "x", "metric_type": "latency", "module_name": "qa"},
        headers=member_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_qa_validate_member_forbidden(client, member_headers):
    resp = await client.post(
        "/api/v1/qa/validate",
        json={"output_id": 1},
        headers=member_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_qa_dashboard_workspace_scoped(client, auth_headers, db_session):
    baseline_resp = await client.get("/api/v1/qa/dashboard", headers=auth_headers)
    assert baseline_resp.status_code == 200
    baseline = baseline_resp.json()

    db_session.add_all(
        [
            Nelvyon_outputs(
                user_id="test-user-00000000-0000-0000-0000-000000000001",
                workspace_id=1,
                project_id=1,
                output_type="social_post",
                content="{}",
                qa_status="passed",
                qa_score=95,
            ),
            Nelvyon_outputs(
                user_id="test-user-00000000-0000-0000-0000-000000000001",
                workspace_id=2,
                project_id=1,
                output_type="social_post",
                content="{}",
                qa_status="failed",
                qa_score=40,
            ),
        ]
    )
    await db_session.commit()

    resp = await client.get("/api/v1/qa/dashboard", headers=auth_headers)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total_outputs"] == baseline["total_outputs"] + 1
    assert payload["passed"] == baseline["passed"] + 1


@pytest.mark.asyncio
async def test_qa_validate_workspace_scoped(client, auth_headers, db_session):
    output = Nelvyon_outputs(
        user_id="test-user-00000000-0000-0000-0000-000000000001",
        workspace_id=1,
        project_id=1,
        output_type="social_post",
        content='{"posts":["one","two","three","four","five","six","seven","eight","nine","ten"]}',
        qa_status="pending",
        qa_attempts=0,
    )
    db_session.add(output)
    await db_session.commit()
    await db_session.refresh(output)

    with patch(
        "services.qa_engine.QAEngineService._ai_quality_check",
        new=AsyncMock(return_value='{"score":95,"issues":[],"strengths":[],"recommendations":[]}'),
    ):
        resp = await client.post(
            "/api/v1/qa/validate",
            json={"output_id": output.id},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["output_id"] == output.id
