"""
Que hace el limitador cuando su almacen falla.

Un limitador es un control de seguridad: si su backend cae y deja pasar todo,
desaparece justo cuando mas hace falta. `RateLimiter.check` captura el error y
devuelve `allowed: False` — falla CERRADO.

Se fija aqui porque es la unica propiedad del limitador que, al romperse, no
produce ningun sintoma visible: todo sigue funcionando, solo que sin limite.

Tambien se fija que un fallback en memoria se declare como tal. Con varias
instancias, un contador por proceso multiplica el limite efectivo por el numero
de instancias; que la respuesta diga `backend: "memory"` es lo que permite
detectarlo en vez de creerse protegido.
"""
from __future__ import annotations

import pytest

from core.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_si_el_almacen_falla_no_se_deja_pasar(monkeypatch):
    """La propiedad central."""
    from core import rate_limiter as modulo

    async def _revienta(*_a, **_k):
        raise RuntimeError("redis caido")

    monkeypatch.setattr(modulo.redis_client, "check_rate_limit", _revienta)

    r = await RateLimiter().rate_limit("k", max_requests=100, window_seconds=60)
    assert r["allowed"] is False, "el limitador dejo pasar con el almacen caido"
    assert r["remaining"] == 0
    assert r["backend"] == "fail-closed"


@pytest.mark.asyncio
async def test_el_fallo_queda_identificado_en_la_respuesta(monkeypatch):
    """Sin esto, un fallo permanente pasaria por un limite alcanzado normal."""
    from core import rate_limiter as modulo

    async def _revienta(*_a, **_k):
        raise RuntimeError("redis caido")

    monkeypatch.setattr(modulo.redis_client, "check_rate_limit", _revienta)

    r = await RateLimiter().rate_limit("k", max_requests=100, window_seconds=60)
    assert r.get("error"), "no se registra la causa del fail-closed"
    assert r["backend"] != "redis"


@pytest.mark.asyncio
async def test_el_backend_en_memoria_se_declara_como_tal(monkeypatch):
    """
    Contraprueba de la anterior y aviso de degradacion: un contador en memoria
    NO es un limite distribuido, y la respuesta debe permitir notarlo.
    """
    from core import rate_limiter as modulo

    async def _ok(*_a, **_k):
        return {"allowed": True, "current": 1, "limit": 100, "remaining": 99, "reset_in": 60}

    monkeypatch.setattr(modulo.redis_client, "check_rate_limit", _ok)
    monkeypatch.setattr(type(modulo.redis_client), "is_redis", property(lambda _s: False))

    r = await RateLimiter().rate_limit("k", max_requests=100, window_seconds=60)
    assert r["allowed"] is True
    assert r["backend"] == "memory", "un fallback en memoria no puede pasar por distribuido"


@pytest.mark.asyncio
async def test_con_redis_disponible_si_se_permite(monkeypatch):
    """Contraprueba: los negativos no vienen de un limitador roto."""
    from core import rate_limiter as modulo

    async def _ok(*_a, **_k):
        return {"allowed": True, "current": 1, "limit": 100, "remaining": 99, "reset_in": 60}

    monkeypatch.setattr(modulo.redis_client, "check_rate_limit", _ok)
    monkeypatch.setattr(type(modulo.redis_client), "is_redis", property(lambda _s: True))

    r = await RateLimiter().rate_limit("k", max_requests=100, window_seconds=60)
    assert r["allowed"] is True
    assert r["backend"] == "redis"


def test_el_limitador_no_vuelve_a_fallar_abierto():
    """Regresion de forma: `allowed: True` en el except seria invisible."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "core" / "rate_limiter.py").read_text(
        encoding="utf-8"
    )
    i = src.index("except Exception as exc:")
    tramo = src[i : i + 400]
    assert '"allowed": False' in tramo, "el limitador empezo a fallar ABIERTO"


# ═══════════════════════════════════════════════════════════════════════════
# Publico no significa ilimitado
# ═══════════════════════════════════════════════════════════════════════════


def test_las_rutas_publicas_fuera_de_api_tambien_se_limitan():
    """El filtro era `not path.startswith("/api/")`, y dejaba fuera seis rutas
    publicas que atienden internet directamente.

    La peor: `POST /store/{subdomain}/checkout`, que CREA PEDIDOS sin
    autenticacion. Sin limite, cualquiera podia generar pedidos indefinidamente
    contra la tienda de un cliente.

    Son publicas a proposito y deben seguir siendolo. Publicas no significa
    ilimitadas.
    """
    from middleware.rate_limit import _EXCLUDED, _PUBLICAS_SIN_API

    def se_limita(p: str) -> bool:
        return p not in _EXCLUDED and (
            p.startswith("/api/") or p.startswith(_PUBLICAS_SIN_API))

    for ruta in ("/store/mi-tienda/checkout", "/store/mi-tienda",
                 "/qr/abc123", "/p/mi-pagina",
                 "/site/cliente", "/site/cliente/contacto"):
        assert se_limita(ruta), f"{ruta} sigue sin limite de tasa"


def test_la_salud_y_los_estaticos_siguen_sin_limite():
    """CONTROL. Limitar `/health` haria que el propio orquestador de la nube
    reiniciara el servicio por creerlo caido — la correccion seria peor."""
    from middleware.rate_limit import _EXCLUDED, _PUBLICAS_SIN_API

    def se_limita(p: str) -> bool:
        return p not in _EXCLUDED and (
            p.startswith("/api/") or p.startswith(_PUBLICAS_SIN_API))

    for ruta in ("/health", "/health/ready", "/docs", "/favicon.ico", "/robots.txt"):
        assert not se_limita(ruta), f"{ruta} quedo limitada y no debe estarlo"
