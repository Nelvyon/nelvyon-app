"""
Autorizacion de `POST /api/ads-agent/briefing`.

`GoogleAdsService` y `MetaAdsService` no aceptan workspace ni tenant: resuelven
UNA sola cuenta, la corporativa de NELVYON. Todo el router opera sobre el dinero
de NELVYON, no sobre datos de un cliente, asi que la autoridad correcta es de
PLATAFORMA. Depender de `require_workspace*` autorizaba bien el recurso
equivocado: cualquier operador de cualquier workspace llegaba a la cuenta.

Importa especialmente porque `BriefingBody.launch` lo controla el cliente y, con
`true`, se crean campanas de pago reales con `daily_budget_eur` tambien elegido
por el cliente (hasta 100.000 EUR/dia).

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

    async def get_reporting_summary(self, **_kwargs) -> dict:
        self.llamadas.append("get_reporting_summary")
        return {"campaigns": [{"campaign_id": "g1", "conversions": 10, "cost": 100}]}

    async def get_campaigns(self, **_kwargs) -> dict:
        self.llamadas.append("get_campaigns")
        return {"campaigns": [{"campaign_id": "m1", "roas": 0.8, "impressions": 10, "clicks": 1, "spend": 5, "reach": 8}]}


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


# --------------------------------------------------------------- permitido
@pytest.mark.asyncio
async def test_superadmin_puede_pedir_briefing(
    client: AsyncClient, super_admin_headers: dict, espia_ads
):
    r = await client.post("/api/ads-agent/briefing", headers=super_admin_headers, json=BRIEFING)
    assert r.status_code == 200, r.text
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_superadmin_con_launch_atraviesa_autorizacion(
    client: AsyncClient, super_admin_headers: dict, espia_ads
):
    r = await client.post(
        "/api/ads-agent/briefing", headers=super_admin_headers, json=_con_launch(launch=True)
    )
    assert r.status_code == 200, r.text
    assert r.json()["launched"] is True
    # Autorizado: SI llega al limite externo, que aqui esta fakeado.
    assert "create_campaign" in espia_ads.llamadas


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta", ["/api/ads-agent/reporting/unified", "/api/ads-agent/alerts/roas"])
async def test_superadmin_puede_leer_reporting(
    client: AsyncClient, super_admin_headers: dict, espia_ads, ruta
):
    r = await client.get(ruta, headers=super_admin_headers)
    assert r.status_code == 200, r.text


# ------------------------------------------------------------- denegaciones
#: Ninguna autoridad de workspace basta: el recurso es de plataforma.
#: Los fixtures son asincronos, asi que se reciben por parametro y se recorren
#: dentro del test — `getfixturevalue` no puede resolverlos en un bucle async.


@pytest.mark.asyncio
async def test_ningun_rol_de_workspace_alcanza_el_briefing(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, member_headers: dict, espia_ads
):
    for nombre, headers in (
        ("owner", auth_headers),
        ("admin", admin_headers),
        ("member", member_headers),
    ):
        r = await client.post("/api/ads-agent/briefing", headers=headers, json=BRIEFING)
        assert r.status_code == 403, f"{nombre}: {r.text}"
    assert espia_ads.llamadas == []


@pytest.mark.asyncio
async def test_ningun_rol_de_workspace_lee_reporting_corporativo(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, member_headers: dict, espia_ads
):
    for nombre, headers in (
        ("owner", auth_headers),
        ("admin", admin_headers),
        ("member", member_headers),
    ):
        for ruta in ("/api/ads-agent/reporting/unified", "/api/ads-agent/alerts/roas"):
            r = await client.get(ruta, headers=headers)
            assert r.status_code == 403, f"{nombre} {ruta}: {r.text}"


@pytest.mark.asyncio
async def test_ningun_rol_de_workspace_optimiza(
    client: AsyncClient, auth_headers: dict, admin_headers: dict, member_headers: dict, espia_ads
):
    for nombre, headers in (
        ("owner", auth_headers),
        ("admin", admin_headers),
        ("member", member_headers),
    ):
        r = await client.post("/api/ads-agent/optimize", headers=headers)
        assert r.status_code == 403, f"{nombre}: {r.text}"


@pytest.mark.asyncio
async def test_operator_con_launch_y_presupuesto_maximo_denegado_sin_efecto(
    client: AsyncClient, auth_headers: dict, espia_ads
):
    """El caso que motiva todo: autoridad de workspace no toca el dinero de NELVYON."""
    r = await client.post(
        "/api/ads-agent/briefing",
        headers=auth_headers,
        json=_con_launch(launch=True, daily_budget_eur=100_000),
    )
    assert r.status_code == 403, r.text
    # Cero llamadas: ni campana, ni copy, ni creatividad.
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
async def test_el_workspace_declarado_es_irrelevante(
    client: AsyncClient, member_headers: dict, espia_ads
):
    """No hay `X-Workspace-Id` que convierta a un usuario en admin de plataforma."""
    for ws in ("1", "99999", "1_0", "no-soy-un-id", ""):
        headers = {**member_headers, "X-Workspace-Id": ws}
        r = await client.post(
            "/api/ads-agent/briefing", headers=headers, json=_con_launch(launch=True)
        )
        assert r.status_code in (401, 403), f"ws={ws!r}: {r.text}"
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
    """
    Sigue siendo la politica de mutacion workspace-scoped del resto del backend.
    No aplica a este router —ahora es platform-scoped— pero se fija aqui porque
    fue lo que se mutó para certificarlo y no debe derivar.
    """
    from core.rbac import workspace_can_mutate

    assert workspace_can_mutate(rol) is esperado
