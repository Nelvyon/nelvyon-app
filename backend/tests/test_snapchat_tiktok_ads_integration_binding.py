"""
Snapchat/TikTok Ads: ningun workspace alcanza la cuenta corporativa.

Ambos son customer-facing —hay dashboards de cliente y flujo OAuth— pero sus
servicios resolvian la cuenta externa desde variables de entorno GLOBALES
(`SNAPCHAT_AD_ACCOUNT_ID`, `TIKTOK_ADVERTISER_ID`), asi que cualquier miembro de
cualquier workspace podia crear campanas reales facturadas a NELVYON.

Se certifican DOS controles distintos, y ambos deben cumplirse:

    1. autoridad:   member/viewer no operan
    2. integracion: sin credencial propia del workspace se falla cerrado

El segundo es el que importa aqui: aunque el actor sea `owner`, sin integracion
propia no se toca al proveedor. La cuenta corporativa NO es fallback.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

CAMPANA = {"name": "Test", "objective": "AWARENESS", "daily_budget_eur": 50}

#: (proveedor, ruta de creacion, variable de entorno de la cuenta corporativa)
PROVEEDORES = [
    ("snapchat", "/api/snapchat-ads/campaigns", "SNAPCHAT_AD_ACCOUNT_ID"),
    ("tiktok", "/api/tiktok-ads/campaigns", "TIKTOK_ADVERTISER_ID"),
]


@pytest.fixture
def sin_red(monkeypatch):
    """
    Cualquier salida HTTP hace fallar el test.

    Es la asercion central: si un negativo llegase a la red, este doble lo
    convierte en error en vez de en una llamada real.
    """
    import httpx

    llamadas: list[str] = []

    class _ClienteProhibido:
        def __init__(self, *_a, **_k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            return False

        async def post(self, url, *_a, **_k):
            llamadas.append(str(url))
            raise AssertionError(f"llamada externa prohibida: {url}")

        async def get(self, url, *_a, **_k):
            llamadas.append(str(url))
            raise AssertionError(f"llamada externa prohibida: {url}")

    monkeypatch.setattr(httpx, "AsyncClient", _ClienteProhibido)
    return llamadas


@pytest.fixture
def cuenta_corporativa_configurada(monkeypatch):
    """
    Simula el peor escenario: las credenciales globales SI estan puestas.

    Sin esto los tests pasarian por el modo `mock` del servicio y no probarian
    nada — que es exactamente el falso positivo a evitar.
    """
    for k, v in (
        ("SNAPCHAT_CLIENT_ID", "cid"),
        ("SNAPCHAT_CLIENT_SECRET", "sec"),
        ("SNAPCHAT_AD_ACCOUNT_ID", "CUENTA_CORPORATIVA_NELVYON"),
        ("TIKTOK_APP_ID", "aid"),
        ("TIKTOK_APP_SECRET", "sec"),
        ("TIKTOK_ACCESS_TOKEN", "tok"),
        ("TIKTOK_ADVERTISER_ID", "ADVERTISER_CORPORATIVO_NELVYON"),
    ):
        monkeypatch.setenv(k, v)


# ───────────────────────────────── control 2: binding de integracion
@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,ruta,_env", PROVEEDORES)
async def test_owner_sin_integracion_propia_falla_cerrado(
    client: AsyncClient,
    auth_headers: dict,
    sin_red,
    cuenta_corporativa_configurada,
    proveedor,
    ruta,
    _env,
):
    """Autoridad suficiente NO basta: hace falta integracion del workspace."""
    r = await client.post(ruta, headers=auth_headers, json=CAMPANA)
    assert r.status_code == 503, r.text
    assert "integration is not configured" in r.text
    # Lo decisivo: no se intento salir a la red con la cuenta corporativa.
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,ruta,env", PROVEEDORES)
async def test_la_cuenta_corporativa_nunca_aparece_en_la_respuesta(
    client: AsyncClient,
    auth_headers: dict,
    sin_red,
    cuenta_corporativa_configurada,
    proveedor,
    ruta,
    env,
):
    corporativa = "CUENTA_CORPORATIVA_NELVYON" if proveedor == "snapchat" else "ADVERTISER_CORPORATIVO_NELVYON"
    r = await client.post(ruta, headers=auth_headers, json=CAMPANA)
    assert corporativa not in r.text
    estado = await client.get(f"/api/{proveedor}-ads/status", headers=auth_headers)
    # `/status` exponia el id de la cuenta corporativa a cualquier miembro.
    assert corporativa not in estado.text, estado.text


# ─────────────────────────────────────────── control 1: autoridad
@pytest.mark.asyncio
@pytest.mark.parametrize("_proveedor,ruta,_env", PROVEEDORES)
async def test_member_denegado_por_autorizacion(
    client: AsyncClient, member_headers: dict, sin_red, _proveedor, ruta, _env
):
    r = await client.post(ruta, headers=member_headers, json=CAMPANA)
    assert r.status_code == 403, r.text
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("_proveedor,ruta,_env", PROVEEDORES)
async def test_workspace_ajeno_denegado(
    client: AsyncClient, member_headers: dict, sin_red, _proveedor, ruta, _env
):
    headers = {**member_headers, "X-Workspace-Id": "99999"}
    r = await client.post(ruta, headers=headers, json=CAMPANA)
    assert r.status_code == 403, r.text
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("_proveedor,ruta,_env", PROVEEDORES)
async def test_sin_sesion_denegado(client: AsyncClient, sin_red, _proveedor, ruta, _env):
    r = await client.post(ruta, headers={"X-Workspace-Id": "1"}, json=CAMPANA)
    assert r.status_code in (401, 403), r.text
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,_ruta,_env", PROVEEDORES)
async def test_member_no_ve_el_estado_de_la_integracion(
    client: AsyncClient, member_headers: dict, sin_red, proveedor, _ruta, _env
):
    """`/status` describe la integracion del workspace: no es para cualquiera."""
    r = await client.get(f"/api/{proveedor}-ads/status", headers=member_headers)
    assert r.status_code == 403, r.text
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,_ruta,_env", PROVEEDORES)
async def test_member_no_puede_pedir_sugerencias(
    client: AsyncClient, member_headers: dict, sin_red, proveedor, _ruta, _env
):
    r = await client.post(
        f"/api/{proveedor}-ads/suggest",
        headers=member_headers,
        json={"product": "x", "audience": "y", "goal": "leads"},
    )
    assert r.status_code == 403, r.text
    assert sin_red == []


# ───────────────────────────────────────── lecturas y sugerencias
@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,_ruta,_env", PROVEEDORES)
async def test_lecturas_de_filas_propias_siguen_disponibles(
    client: AsyncClient, auth_headers: dict, sin_red, proveedor, _ruta, _env
):
    """
    `list_campaigns` y `get_metrics` leen filas locales filtradas por
    `workspace_id` y no consultan al proveedor, asi que no se cortan.
    """
    for ruta in (f"/api/{proveedor}-ads/campaigns", f"/api/{proveedor}-ads/metrics"):
        r = await client.get(ruta, headers=auth_headers)
        assert r.status_code == 200, f"{ruta}: {r.text}"
    assert sin_red == []


@pytest.mark.asyncio
@pytest.mark.parametrize("proveedor,_ruta,_env", PROVEEDORES)
async def test_la_resolucion_de_integracion_no_cae_a_la_global(
    proveedor, _ruta, _env, cuenta_corporativa_configurada
):
    """Propiedad del mecanismo, sin HTTP: nunca devuelve una cuenta."""
    from core.ads_integration import resolve_workspace_ads_integration

    for ws in (1, 2, 99999):
        assert await resolve_workspace_ads_integration(ws, proveedor) is None
