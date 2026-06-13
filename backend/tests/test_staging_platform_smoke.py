"""Smoke tests for staging platform flows: nelvyon JWT → workspace → client → campaign."""

from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient

NELVYON_JWT_SECRET = "test-nelvyon-jwt-secret-at-least-32-chars"


def _nelvyon_token(user_id: str, email: str, plan: str = "starter") -> str:
    return jwt.encode(
        {
            "userId": user_id,
            "email": email,
            "tenantId": str(uuid4()),
            "plan": plan,
        },
        NELVYON_JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture(autouse=True)
def _nelvyon_jwt_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", NELVYON_JWT_SECRET)
    monkeypatch.setenv("JWT_SECRET_KEY", NELVYON_JWT_SECRET)


@pytest.mark.asyncio
async def test_health_liveness(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


@pytest.mark.asyncio
async def test_health_ready_db(client: AsyncClient):
    r = await client.get("/health/ready")
    assert r.status_code == 200
    body = r.json()
    assert body.get("database") == "ok"


@pytest.mark.asyncio
async def test_nelvyon_jwt_workspace_list_create(client: AsyncClient):
    uid = f"staging-smoke-{uuid4().hex[:8]}"
    email = f"{uid}@nelvyon.test"
    token = _nelvyon_token(uid, email)
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200, me.text

    listed = await client.get("/api/v1/workspace/list", headers=headers)
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    assert isinstance(rows, list)

    slug = f"ws-{uuid4().hex[:8]}"
    created = await client.post(
        "/api/v1/workspace/create",
        headers=headers,
        json={"name": "Smoke Workspace", "slug": slug},
    )
    assert created.status_code == 201, created.text
    ws = created.json()
    assert ws.get("id")
    assert ws.get("name") == "Smoke Workspace"

    relist = await client.get("/api/v1/workspace/list", headers=headers)
    assert relist.status_code == 200
    ids = {w["id"] for w in relist.json()}
    assert ws["id"] in ids


@pytest.mark.asyncio
async def test_nelvyon_jwt_client_and_campaign_flow(client: AsyncClient):
    uid = f"staging-abcd-{uuid4().hex[:8]}"
    email = f"{uid}@nelvyon.test"
    token = _nelvyon_token(uid, email)
    headers = {"Authorization": f"Bearer {token}"}

    ws = await client.post(
        "/api/v1/workspace/create",
        headers=headers,
        json={"name": "Campaign WS", "slug": f"cws-{uuid4().hex[:8]}"},
    )
    assert ws.status_code == 201, ws.text
    ws_id = ws.json()["id"]
    scoped = {**headers, "X-Workspace-Id": str(ws_id)}

    client_row = await client.post(
        "/api/v1/entities/nelvyon_clients",
        headers=scoped,
        json={"business_name": "Smoke Client", "sector": "Tech"},
    )
    assert client_row.status_code in (200, 201), client_row.text
    client_id = client_row.json()["id"]

    campaign = await client.post(
        "/api/v1/entities/nelvyon_campaigns",
        headers=scoped,
        json={
            "project_id": client_id,
            "client_id": client_id,
            "platform": "email",
            "campaign_type": "nurturing",
            "name": "Smoke Campaign",
            "status": "draft",
        },
    )
    assert campaign.status_code in (200, 201), campaign.text
    camp_id = campaign.json()["id"]

    listed = await client.get(
        "/api/v1/entities/nelvyon_campaigns?skip=0&limit=20",
        headers=scoped,
    )
    assert listed.status_code == 200, listed.text
    items = listed.json().get("items", [])
    assert any(c.get("id") == camp_id for c in items)

    detail = await client.get(
        f"/api/v1/entities/nelvyon_campaigns/{camp_id}",
        headers=scoped,
    )
    assert detail.status_code == 200, detail.text
    assert detail.json().get("name") == "Smoke Campaign"
