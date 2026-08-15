"""
Autoridad de plataforma en los routers de Ads corporativos.

Mismo defecto de clase que `ads_agent`, hallado al arreglar aquel:
`google_ads.py` y `meta_ads.py` exponian diez endpoints con `require_workspace`
—mera pertenencia— sobre servicios cuyas credenciales son globales
(`GOOGLE_ADS_CUSTOMER_ID`, `META_AD_ACCOUNT_ID`) y que no aceptan workspace ni
tenant: cero referencias en ambos servicios. Cuatro de esos endpoints CREAN
campanas y creatividades facturadas a NELVYON.

Los negativos afirman lo que de verdad importa: ningun rol de workspace alcanza
la cuenta corporativa, ni para leer, y ninguna llamada externa se produce.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


class _EspiaExterno:
    """Cualquier salida hacia Google/Meta queda registrada aqui."""

    def __init__(self) -> None:
        self.llamadas: list[str] = []

    def _reg(self, nombre: str):
        async def _f(*_a, **_k):
            self.llamadas.append(nombre)
            return {"campaign_id": "fake", "campaigns": [], "ok": True}

        return _f

    def __getattr__(self, nombre: str):
        return self._reg(nombre)


@pytest.fixture
def espia(monkeypatch):
    from services import google_ads_service, meta_ads_service

    e = _EspiaExterno()
    monkeypatch.setattr(google_ads_service, "get_google_ads_service", lambda: e)
    monkeypatch.setattr(meta_ads_service, "get_meta_ads_service", lambda: e)
    return e


#: (metodo, ruta, cuerpo). Los POST son los que crean gasto.
ENDPOINTS = [
    ("GET", "/api/google-ads/status", None),
    ("GET", "/api/google-ads/campaigns", None),
    ("GET", "/api/google-ads/reporting", None),
    ("POST", "/api/google-ads/campaigns", {"name": "x", "daily_budget_eur": 50}),
    ("POST", "/api/google-ads/creatives/ad-copy", {"campaign_id": "1", "headlines": ["a"]}),
    ("GET", "/api/meta-ads/status", None),
    ("GET", "/api/meta-ads/campaigns", None),
    ("GET", "/api/meta-ads/reporting", None),
    ("POST", "/api/meta-ads/campaigns", {"name": "x", "daily_budget_eur": 50}),
    ("POST", "/api/meta-ads/creatives", {"image_url": "http://x/y.png"}),
]


async def _llamar(client: AsyncClient, metodo: str, ruta: str, cuerpo, headers):
    if metodo == "GET":
        return await client.get(ruta, headers=headers)
    return await client.post(ruta, headers=headers, json=cuerpo or {})


@pytest.mark.asyncio
@pytest.mark.parametrize("metodo,ruta,cuerpo", ENDPOINTS)
async def test_ningun_rol_de_workspace_alcanza_la_cuenta_corporativa(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    member_headers: dict,
    espia,
    metodo,
    ruta,
    cuerpo,
):
    for nombre, headers in (
        ("owner", auth_headers),
        ("admin", admin_headers),
        ("member", member_headers),
    ):
        r = await _llamar(client, metodo, ruta, cuerpo, headers)
        assert r.status_code == 403, f"{nombre} {metodo} {ruta}: {r.status_code} {r.text[:200]}"
    # Ni siquiera se intento salir hacia Google/Meta.
    assert espia.llamadas == []


@pytest.mark.asyncio
@pytest.mark.parametrize("metodo,ruta,cuerpo", ENDPOINTS)
async def test_sin_sesion_denegado(client: AsyncClient, espia, metodo, ruta, cuerpo):
    r = await _llamar(client, metodo, ruta, cuerpo, {"X-Workspace-Id": "1"})
    assert r.status_code in (401, 403), f"{metodo} {ruta}: {r.text[:200]}"
    assert espia.llamadas == []


@pytest.mark.asyncio
async def test_superadmin_si_accede(client: AsyncClient, super_admin_headers: dict, espia):
    """Contraprueba: los negativos no pasan porque el endpoint este roto."""
    r = await client.get("/api/google-ads/status", headers=super_admin_headers)
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_ningun_workspace_declarado_concede_acceso(
    client: AsyncClient, member_headers: dict, espia
):
    """La autoridad sale del rol del JWT, no de la cabecera de workspace."""
    for ws in ("1", "99999", "1_0", "no-soy-un-id", ""):
        headers = {**member_headers, "X-Workspace-Id": ws}
        r = await client.post(
            "/api/google-ads/campaigns", headers=headers, json={"name": "x", "daily_budget_eur": 50}
        )
        assert r.status_code in (401, 403), f"ws={ws!r}: {r.text[:200]}"
    assert espia.llamadas == []
