"""Phase O — GET /api/v1/os/autonomous/learning tests."""
import json
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

LEARNING_BASE = "/api/v1/os/autonomous/learning"


@pytest.fixture
def viewer_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "viewer-user-00000000-0000-0000-0000-000000000088",
            "email": "viewer@test.com",
            "name": "Viewer User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.fixture
def member_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "member-user-00000000-0000-0000-0000-000000000066",
            "email": "member@test.com",
            "name": "Member User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.fixture
def operator_headers():
    from core.auth import create_access_token

    token = create_access_token(
        {
            "sub": "operator-user-00000000-0000-0000-0000-000000000077",
            "email": "operator@test.com",
            "name": "Operator User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}", "X-Workspace-Id": "1"}


@pytest.fixture
async def seed_learning_rbac(db_session):
    from sqlalchemy import text

    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO users (id, email, name, role)
            VALUES
            ('viewer-user-00000000-0000-0000-0000-000000000088', 'viewer@test.com', 'Viewer', 'user'),
            ('member-user-00000000-0000-0000-0000-000000000066', 'member@test.com', 'Member', 'user'),
            ('operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'Operator', 'user')
            """
        )
    )
    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, email, role, status)
            VALUES
            (1, 'viewer-user-00000000-0000-0000-0000-000000000088', 'viewer@test.com', 'viewer', 'active'),
            (1, 'member-user-00000000-0000-0000-0000-000000000066', 'member@test.com', 'member', 'active'),
            (1, 'operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'operator', 'active')
            """
        )
    )
    await db_session.commit()


@pytest.fixture
def local_outcomes_fixture(tmp_path, monkeypatch):
    learning_dir = tmp_path / "learning"
    learning_dir.mkdir(parents=True)
    outcomes = [
        {
            "id": str(uuid.uuid4()),
            "project_ref": "proj-o-1",
            "template_id": "landing-cro-v3",
            "category": "landing",
            "sector": "restaurant",
            "service": "landing",
            "objective": "lead_gen",
            "channel": "web",
            "language": "es",
            "level": "professional",
            "qa_score": 88,
            "approved_by_client": True,
            "revisions_count": 0,
            "conversion_rate": 9.2,
            "lead_count": 12,
            "client_rating": None,
            "delivery_time_hours": 4,
            "result_status": "client_approved",
            "created_at": "2026-06-01T10:00:00+00:00",
        }
    ]
    rankings = {
        "computed_at": "2026-06-08T00:00:00+00:00",
        "slices": [
            {
                "slice": {
                    "category": "landing",
                    "sector": "restaurant",
                    "service": "landing",
                },
                "ranked": [
                    {
                        "template_id": "landing-cro-v3",
                        "sample_size": 1,
                        "cold_start": True,
                        "conversion_score": 72.5,
                        "quality_score": 80.0,
                        "usage_score": 65.0,
                        "reliability_score": 78.0,
                        "final_template_score": 74.2,
                        "metrics": {
                            "qa_avg": 88,
                            "approval_rate": 1.0,
                            "reject_rate": 0,
                            "revisions_avg": 0,
                            "conversion_avg": 9.2,
                            "first_pass_rate": 1.0,
                        },
                    }
                ],
            }
        ],
    }
    (learning_dir / "local-outcomes.json").write_text(json.dumps(outcomes), encoding="utf-8")
    (learning_dir / "rankings.json").write_text(json.dumps(rankings), encoding="utf-8")

    monkeypatch.setattr(
        "services.os_autonomous_learning_service._LEARNING_OUTPUT",
        learning_dir,
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._RANKINGS_PATH",
        learning_dir / "rankings.json",
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._LOCAL_OUTCOMES_PATH",
        learning_dir / "local-outcomes.json",
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._ENRICHED_PATH",
        learning_dir / "enrichedOutcomes.json",
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._REPORT_PATH",
        learning_dir / "learningReport.json",
    )
    return learning_dir


@pytest.mark.asyncio
async def test_learning_viewer_forbidden(client: AsyncClient, seed_learning_rbac, viewer_headers):
    r = await client.get(LEARNING_BASE, headers=viewer_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_learning_member_forbidden(client: AsyncClient, seed_learning_rbac, member_headers):
    r = await client.get(LEARNING_BASE, headers=member_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_learning_operator_returns_rankings(
    client: AsyncClient,
    seed_learning_rbac,
    operator_headers,
    local_outcomes_fixture,
):
    r = await client.get(LEARNING_BASE, headers=operator_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["storage_mode"] == "local"
    assert data["outcomes_count"] >= 1
    assert len(data["top_templates"]) >= 1
    top = data["top_templates"][0]
    assert top["template_id"] == "landing-cro-v3"
    assert top["final_template_score"] > 0
    assert "ga4" in data
    assert "message" in data["ga4"]


@pytest.mark.asyncio
async def test_learning_empty_local_fallback(
    client: AsyncClient,
    seed_learning_rbac,
    operator_headers,
    tmp_path,
    monkeypatch,
):
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    monkeypatch.setattr("services.os_autonomous_learning_service._LEARNING_OUTPUT", empty_dir)
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._RANKINGS_PATH", empty_dir / "rankings.json"
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._LOCAL_OUTCOMES_PATH",
        empty_dir / "local-outcomes.json",
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._ENRICHED_PATH",
        empty_dir / "enrichedOutcomes.json",
    )
    monkeypatch.setattr(
        "services.os_autonomous_learning_service._REPORT_PATH",
        empty_dir / "learningReport.json",
    )

    r = await client.get(LEARNING_BASE, headers=operator_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["storage_mode"] == "none"
    assert data["outcomes_count"] == 0
    assert data["top_templates"] == []
