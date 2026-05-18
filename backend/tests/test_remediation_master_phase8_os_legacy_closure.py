"""
NELVYON-REMEDIATION-1 Fase 8 — cierre OS/legacy de riesgo (bloque nelvyon_* restante).
"""
import pytest
from httpx import AsyncClient
from core.auth import create_access_token


@pytest.fixture
def auth_only_headers() -> dict:
    token = create_access_token(
        {
            "sub": "test-user-00000000-0000-0000-0000-000000000001",
            "email": "testuser@nelvyon-test.com",
            "name": "Test User",
            "role": "user",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/entities/nelvyon_agents",
        "/api/v1/entities/nelvyon_assets",
        "/api/v1/entities/nelvyon_clients",
        "/api/v1/entities/nelvyon_products",
        "/api/v1/entities/nelvyon_user_settings",
    ],
)
async def test_phase8_os_endpoints_require_workspace_header(
    client: AsyncClient, auth_only_headers: dict, path: str
):
    r = await client.get(path, headers=auth_only_headers)
    assert r.status_code in (400, 401, 403, 422)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/entities/nelvyon_agents",
        "/api/v1/entities/nelvyon_assets",
        "/api/v1/entities/nelvyon_clients",
        "/api/v1/entities/nelvyon_products",
        "/api/v1/entities/nelvyon_user_settings",
    ],
)
async def test_phase8_os_endpoints_member_can_read_workspace_scoped_list(
    client: AsyncClient, member_headers: dict, path: str
):
    """Fase 10: lecturas OS con require_workspace — miembro activo puede listar su workspace."""
    r = await client.get(path, headers=member_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_phase8_os_endpoints_member_cannot_create_without_operator(
    client: AsyncClient, member_headers: dict
):
    """Mutaciones OS exigen require_workspace_operator."""
    r = await client.post(
        "/api/v1/entities/nelvyon_agents",
        headers=member_headers,
        json={
            "agent_id": "phase8-member-blocked",
            "name": "Blocked by RBAC",
            "status": "active",
        },
    )
    assert r.status_code == 403
