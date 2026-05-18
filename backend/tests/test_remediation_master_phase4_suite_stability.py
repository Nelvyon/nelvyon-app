"""
NELVYON-REMEDIATION-1 FASE 4 — estabilidad suite + invariantes mínimos legacy/OS.

- OS `nelvyon_campaigns`: mutaciones ya con `require_workspace_operator`; sin header workspace → 400.
- Workspace create: en ENVIRONMENT=test el límite por usuario es configurable (conftest).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_nelvyon_campaigns_create_requires_workspace_header(client: AsyncClient, auth_headers: dict):
    """Dominio legacy OS: no mutar sin X-Workspace-Id (mismo patrón que CRM SaaS)."""
    no_ws = {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}
    suffix = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/entities/nelvyon_campaigns",
        json={
            "project_id": 1,
            "platform": "web",
            "campaign_type": "awareness",
            "name": f"OS-{suffix}",
        },
        headers=no_ws,
    )
    assert r.status_code == 400
    assert "workspace" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_workspace_create_allowed_under_test_limit(client: AsyncClient, auth_headers: dict):
    """Smoke: crear workspace no choca con el tope bajo del entorno test (64 en conftest)."""
    no_ws = {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}
    suffix = uuid4().hex[:8]
    r = await client.post(
        "/api/v1/workspace/create",
        json={"name": f"Phase4-{suffix}", "slug": f"phase4-{suffix}"},
        headers=no_ws,
    )
    assert r.status_code == 201, r.text
    assert r.json().get("id") is not None
