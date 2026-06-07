"""
Phase G — Restaurant landing pilot controlled OS staging publish tests.
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


def _phase_g_payload(
    client_id: str,
    project_id: str,
    *,
    qa_score: float = 92.0,
    dry_run: bool = True,
) -> dict:
    brief = _load_pilot_brief()
    return {
        "dry_run": dry_run,
        "sector": "restaurant",
        "sku": "landing",
        "project_id": "pilot-phase-g-restaurant-landing",
        "os_refs": {
            "client_id": client_id,
            "project_id": project_id,
            "project_slug": "LANDING-RESERVA-DIRECTA",
            "workspace_id": 1,
        },
        "deliverables": [
            {
                "type": "url",
                "label": "Landing staging/live",
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
        "autonomous_job_id": "autonomous_job_phase_g_rest",
        "artifacts": {
            "build": {"staging_url": f"https://{brief['domain']['host']}"},
            "pilot": {"sector": "restaurant", "sku": "landing", "phase": "G"},
        },
        "note": "Phase G restaurant landing staging controlled publish",
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
    r = await client.post(
        CLIENTS_BASE,
        headers=headers,
        json={"business_name": name, "sector": "restaurant"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _create_project(
    client: AsyncClient, headers: dict, *, client_id: str, name: str
) -> dict:
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
async def test_phase_g_dry_run_no_write_when_flag_false(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.delenv("AUTONOMOUS_PRODUCTION", raising=False)
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PhaseG {suf}")
    project = await _create_project(
        client,
        auth_headers,
        client_id=os_client["id"],
        name=f"Landing Reserva Directa {suf}",
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_phase_g_payload(os_client["id"], project["id"], dry_run=True),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True
    assert body["written"] is False
    assert body["created"] == []

    after = await _count_deliverables(client, auth_headers)
    assert after == before


@pytest.mark.asyncio
async def test_phase_g_without_production_flag_blocks_write(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.delenv("AUTONOMOUS_PRODUCTION", raising=False)
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PhaseGBlock {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"Proj {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_phase_g_payload(os_client["id"], project["id"], dry_run=False),
    )
    assert r.status_code == 403
    assert await _count_deliverables(client, auth_headers) == before


@pytest.mark.asyncio
async def test_phase_g_with_flag_creates_in_review_internal_and_metadata(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.setenv("AUTONOMOUS_PRODUCTION", "true")
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PhaseGProd {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"Landing RD {suf}"
    )
    before = await _count_deliverables(client, auth_headers)

    r = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_phase_g_payload(os_client["id"], project["id"], dry_run=False),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["written"] is True
    assert body["dry_run"] is False
    assert len(body["created"]) == 2
    assert all(item["status"] == "in_review" for item in body["created"])
    assert all(item["visibility"] == "internal" for item in body["created"])

    after = await _count_deliverables(client, auth_headers)
    assert after == before + 2

    detail = await client.get(
        f"{DELIVERABLES_BASE}/{body['created'][0]['id']}",
        headers=auth_headers,
    )
    assert detail.status_code == 200
    row = detail.json()
    assert row["visibility"] == "internal"
    assert row["status"] == "in_review"

    meta = row.get("metadata") or {}
    assert meta.get("autonomous_provenance") is True
    assert meta.get("autonomous_phase") == "G"
    assert meta.get("sector") == "restaurant"
    assert meta.get("sku") == "landing"
    assert meta.get("qa_score") >= 85
    assert meta.get("artifacts") is not None
    assert "build" in meta["artifacts"]


@pytest.mark.asyncio
async def test_phase_g_manual_workflow_compatible_after_autonomous_publish(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    """Autonomous publish stays internal; manual deliver→approve→publish still works."""
    monkeypatch.setenv("AUTONOMOUS_PRODUCTION", "true")
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PhaseGFlow {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"Flow {suf}"
    )

    pub = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_phase_g_payload(os_client["id"], project["id"], dry_run=False),
    )
    assert pub.status_code == 200, pub.text
    did = pub.json()["created"][0]["id"]

    detail = await client.get(f"{DELIVERABLES_BASE}/{did}", headers=auth_headers)
    assert detail.json()["visibility"] == "internal"

    for step in ("deliver", "approve", "publish"):
        wr = await client.post(f"{DELIVERABLES_BASE}/{did}/{step}", headers=auth_headers)
        assert wr.status_code == 200, wr.text

    final = await client.get(f"{DELIVERABLES_BASE}/{did}", headers=auth_headers)
    assert final.json()["status"] == "published"
    assert final.json()["visibility"] == "client_visible"


@pytest.mark.asyncio
async def test_phase_g_never_auto_client_visible(
    client: AsyncClient, auth_headers: dict, seed_os_rbac_members, monkeypatch
):
    monkeypatch.setenv("AUTONOMOUS_PRODUCTION", "true")
    suf = uuid.uuid4().hex[:8]
    os_client = await _create_os_client(client, auth_headers, name=f"PhaseGVis {suf}")
    project = await _create_project(
        client, auth_headers, client_id=os_client["id"], name=f"Vis {suf}"
    )

    pub = await client.post(
        PUBLISH_BASE,
        headers=auth_headers,
        json=_phase_g_payload(os_client["id"], project["id"], dry_run=False),
    )
    assert pub.status_code == 200, pub.text

    for item in pub.json()["created"]:
        detail = await client.get(
            f"{DELIVERABLES_BASE}/{item['id']}",
            headers=auth_headers,
        )
        assert detail.status_code == 200
        row = detail.json()
        assert row["visibility"] == "internal"
        assert row["status"] == "in_review"
        assert row["visibility"] != "client_visible"


@pytest.fixture(autouse=True)
def _reset_autonomous_production_env(monkeypatch):
    monkeypatch.delenv("AUTONOMOUS_PRODUCTION", raising=False)
    yield
