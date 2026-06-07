"""
Phase F — Restaurant landing pilot Phase D dry-run (no DB writes).
"""
import json
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

CLIENTS_BASE = "/api/v1/os/clients"
PROJECTS_BASE = "/api/v1/os/projects"
DELIVERABLES_BASE = "/api/v1/os/deliverables"
PUBLISH_BASE = "/api/v1/os/autonomous/publish"

PILOT_FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "autonomous"
    / "fixtures"
    / "restaurant-landing-pilot.json"
)


def _load_pilot_brief() -> dict:
    return json.loads(PILOT_FIXTURE.read_text(encoding="utf-8"))


def _pilot_publish_payload(client_id: str, project_id: str, qa_score: float = 92.0) -> dict:
    brief = _load_pilot_brief()
    return {
        "dry_run": True,
        "sector": "restaurant",
        "project_id": "pilot-phase-f-restaurant-landing",
        "os_refs": {
            "client_id": client_id,
            "project_id": project_id,
            "project_slug": "PILOT-RESTAURANT-LANDING-F",
            "workspace_id": 1,
        },
        "deliverables": [
            {
                "type": "url",
                "label": "Landing staging",
                "value": f"https://{brief['domain']['host']}",
                "visibility": "client",
            },
            {
                "type": "file",
                "label": "QA Report",
                "value": "mock://artifacts/qa-report.pdf",
                "visibility": "internal",
            },
        ],
        "qa_score": qa_score,
        "autonomous_job_id": "autonomous_job_pilot_rest_f",
        "artifacts": {"pilot_id": brief.get("pilot_id"), "sector": "restaurant", "phase": "F"},
        "note": "Phase F restaurant landing pilot dry-run",
    }


@pytest.fixture
async def seed_os_rbac_members(db_session):
    from sqlalchemy import text

    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO users (id, email, name, role)
            VALUES ('operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'Operator', 'user')
            """
        )
    )
    await db_session.execute(
        text(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, email, role, status)
            VALUES (1, 'operator-user-00000000-0000-0000-0000-000000000077', 'operator@test.com', 'operator', 'active')
            """
        )
    )
    await db_session.commit()


async def _create_os_client(client: AsyncClient, headers: dict, *, name: str) -> dict:
    r = await client.post(CLIENTS_BASE, headers=headers, json={"business_name": name, "sector": "restaurant"})
    assert r.status_code == 201, r.text
    return r.json()


async def _create_project(client: AsyncClient, headers: dict, *, client_id: str, name: str) -> dict:
    r = await client.post(
        PROJECTS_BASE,
        headers=headers,
        json={"client_id": client_id, "name": name, "status": "active", "priority": "medium"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _count_deliverables(client: AsyncClient, headers: dict) -> int:
    r = await client.get(DELIVERABLES_BASE, headers=headers, params={"page_size": 200})
    assert r.status_code == 200, r.text
    return int(r.json().get("total", 0))


@pytest.mark.asyncio
async def test_phase_f_pilot_publish_dry_run_no_db_write(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members
):
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PilotRest {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"PilotProj {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    payload = _pilot_publish_payload(os_client["id"], project["id"], qa_score=90.0)
    r = await client.post(PUBLISH_BASE, headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True
    assert body["written"] is False
    assert body["created"] == []
    assert body["qa_score"] >= 85

    after = await _count_deliverables(client, auth_headers)
    assert after == before
    assert len(body.get("deliverables_preview", [])) >= 1
