"""
Autorizacion de `POST /api/ads-agent/briefing`.

El endpoint dependia de `require_workspace`, que solo comprueba PERTENENCIA al
workspace. Sus 21 endpoints mutantes hermanos usan `require_workspace_operator`.
La diferencia importa porque `BriefingBody.launch` lo controla el cliente y, con
`true`, el servicio crea campanas de pago reales en Google Ads y Meta con un
`daily_budget_eur` tambien elegido por el cliente (hasta 100.000 EUR/dia).

Estos tests atraviesan la dependencia REAL. Lo unico sustituido es el limite
externo: los servicios de Google/Meta se fakean para que ninguna ejecucion pueda
generar gasto. Ese doble ademas es lo que permite la asercion decisiva de los
casos negativos: CERO llamadas externas.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


class _EspiaAds:
    """Registra toda llamada externa. Si un negativo la toca, el test falla."""

    def __init__(self) -> None:
        self.llamadas: list[str] = []

    async def create_campaign(self, **_kwargs) -> dict:
        self.llamadas.append("create_campaign")
        return {"campaign_id": "camp_fake_1"}

    async def upload_ad_copy(self, **_kwargs) -> dict:
        self.llamadas.append("upload_ad_copy")
        return {"ok": True}

    async def upload_creative(self, **_kwargs) -> dict:
        self.llamadas.append("upload_creative")
        return {"ok": True}


@pytest.fixture
def espia_ads(monkeypatch):
    """Sustituye Google/Meta y la estrategia LLM en el limite externo."""
    from services import ads_agent_service

    espia = _EspiaAds()
    monkeypatch.setattr(ads_agent_service, "get_google_ads_service", lambda: espia)
    monkeypatch.setattr(ads_agent_service, "get_meta_ads_service", lambda: espia)

    async def _estrategia_falsa(_briefing):
        return {"google": {"name": "fake"}, "meta": {"name": "fake"}}

    monkeypatch.setattr(ads_agent_service, "_gpt_strategy", _estrategia_falsa)
    return espia


BRIEFING = {
    "product": "NELVYON",
    "audience": "pymes",
    "goal": "conversions",
    "daily_budget_eur": 80,
}


def _con_launch(**extra):
    return {**BRIEFING, **extra}


# --------------------------------------------------------------- permitidos
@pytest.mark.asyncio
async def test_owner_puede_pedir_briefing(client: AsyncClient, auth_headers: dict, espia_ads):
    r = await client.post("/api/ads-agent/briefing", headers=auth_headers, json=BRIEFING)
    assert r.status_code == 200, r.text
    # Sin launch no se toca ningun servicio externo.
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_owner_con_launch_atraviesa_autorizacion(
    client: AsyncClient, auth_headers: dict, espia_ads
):
    r = await client.post(
        "/api/ads-agent/briefing", headers=auth_headers, json=_con_launch(launch=True)
    )
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["launched"] is True
    # Autorizado: SI llega al limite externo — que aqui esta fakeado.
    assert "create_campaign" in espia_ads.llamadas


# ------------------------------------------------------------- denegaciones
@pytest.mark.asyncio
async def test_member_denegado(client: AsyncClient, member_headers: dict, espia_ads):
    r = await client.post("/api/ads-agent/briefing", headers=member_headers, json=BRIEFING)
    assert r.status_code == 403, r.text
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_member_con_launch_denegado_antes_del_efecto_externo(
    client: AsyncClient, member_headers: dict, espia_ads
):
    """El caso que motiva todo esto: sin autoridad no se llega a gastar."""
    r = await client.post(
        "/api/ads-agent/briefing",
        headers=member_headers,
        json=_con_launch(launch=True, daily_budget_eur=100_000),
    )
    assert r.status_code == 403, r.text
    # Cero llamadas: ni campana, ni copy, ni creatividad. La autorizacion ocurre
    # antes de instanciar nada externo.
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_sin_sesion_denegado(client: AsyncClient, espia_ads):
    r = await client.post(
        "/api/ads-agent/briefing",
        headers={"X-Workspace-Id": "1"},
        json=_con_launch(launch=True),
    )
    assert r.status_code in (401, 403), r.text
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_workspace_ajeno_denegado(
    client: AsyncClient, member_headers: dict, espia_ads
):
    """Miembro del workspace 1 apuntando a otro workspace."""
    headers = {**member_headers, "X-Workspace-Id": "99999"}
    r = await client.post(
        "/api/ads-agent/briefing", headers=headers, json=_con_launch(launch=True)
    )
    assert r.status_code == 403, r.text
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_sin_cabecera_de_workspace_denegado(
    client: AsyncClient, auth_headers: dict, espia_ads
):
    """`require_workspace_operator` exige contexto de workspace explicito."""
    headers = {k: v for k, v in auth_headers.items() if k.lower() != "x-workspace-id"}
    r = await client.post(
        "/api/ads-agent/briefing", headers=headers, json=_con_launch(launch=True)
    )
    assert r.status_code in (400, 403), r.text
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_workspace_id_no_numerico_denegado(
    client: AsyncClient, auth_headers: dict, espia_ads
):
    headers = {**auth_headers, "X-Workspace-Id": "no-soy-un-id"}
    r = await client.post(
        "/api/ads-agent/briefing", headers=headers, json=_con_launch(launch=True)
    )
    assert r.status_code in (400, 403), r.text
    assert espia_ads.llamadas == []


# --------------------------------------------- politica de roles, sin HTTP
@pytest.mark.parametrize(
    "rol,esperado",
    [
        ("owner", True),
        ("admin", True),
        ("operator", True),
        ("member", False),
        ("viewer", False),
        ("jefe_supremo", False),
        ("", False),
        (None, False),
    ],
)
def test_politica_de_mutacion_por_rol(rol, esperado):
    """La politica vive en un unico sitio; se fija aqui para que no derive."""
    from core.rbac import workspace_can_mutate

    assert workspace_can_mutate(rol) is esperado
