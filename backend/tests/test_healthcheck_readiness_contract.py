"""El healthcheck de despliegue comprueba la base; el de liveness no.

POR QUE SE CAMBIO
-----------------
`railway.backend.json` apuntaba a `/health`, que devuelve `{"status":
"healthy"}` incondicionalmente. Un despliegue con `DATABASE_URL` presente pero
apuntando a una base inalcanzable pasaba el healthcheck, se PROMOCIONABA y
fallaba peticion a peticion. El proceso parecia sano mientras el producto no
servia nada.

`/health/ready` ejecuta `SELECT 1` y devuelve 503 si la base no responde, asi
que un despliegue roto no llega a recibir trafico.

LOS DOS SIGUEN EXISTIENDO, Y NO SON LO MISMO
--------------------------------------------
    /health         liveness   — ¿el proceso responde? Barato, sin dependencias.
    /health/ready   readiness  — ¿puede SERVIR? Comprueba la base.

Railway usa su healthcheck para decidir si promociona, asi que ahi la pregunta
correcta es la de readiness. `/health` se conserva porque responder «vivo» sin
tocar la base sigue siendo util: distingue «proceso colgado» de «base caida»,
que son incidencias distintas con respuestas distintas.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

RAIZ = Path(__file__).resolve().parent.parent
CONFIGS = (
    RAIZ / "railway.json",
    RAIZ.parent / "railway.backend.json",
)


def _config(ruta: Path) -> dict:
    return json.loads(ruta.read_text(encoding="utf-8"))


@pytest.mark.parametrize("ruta", CONFIGS, ids=lambda p: p.name)
def test_el_healthcheck_de_despliegue_es_readiness(ruta):
    """Si vuelve a `/health`, vuelve a promocionarse un despliegue roto."""
    assert ruta.exists(), f"falta {ruta.name}"
    assert _config(ruta)["deploy"]["healthcheckPath"] == "/health/ready", (
        f"{ruta.name} apunta a un healthcheck que no comprueba la base"
    )


def test_los_dos_ficheros_de_config_dicen_lo_mismo():
    """El servicio API tiene DOS ficheros de configuracion.

    Railway usa uno u otro segun como este montado el servicio. Si se separan,
    el healthcheck real depende de un detalle del panel, que es exactamente el
    tipo de cosa que nadie revisa hasta que falla.
    """
    rutas = [_config(r)["deploy"]["healthcheckPath"] for r in CONFIGS]
    assert len(set(rutas)) == 1, f"configuraciones divergentes: {rutas}"


@pytest.mark.asyncio
async def test_liveness_responde_sin_tocar_la_base():
    """`/health` no debe depender de la base: es lo que lo hace util."""
    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


@pytest.mark.asyncio
async def test_readiness_esta_verde_con_la_base_disponible(client):
    """Control negativo: si readiness fuese siempre 503, el guard seria inutil.

    Se usa el cliente de la suite, que tiene base preparada.
    """
    r = await client.get("/health/ready")
    assert r.status_code == 200, r.text[:200]
    cuerpo = r.json()
    assert cuerpo["database"] == "ok"
    assert cuerpo["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_falla_si_la_base_no_responde(client, monkeypatch):
    """La propiedad entera: base caida -> 503, no 200.

    Se simula el fallo en la CONSULTA, no en la configuracion: es el caso que el
    healthcheck anterior no distinguia — proceso arriba, base inalcanzable.
    """
    from core.database import db_manager

    class _SesionQueRevienta:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return False

        async def execute(self, *_a, **_k):
            raise RuntimeError("could not connect to server")

    monkeypatch.setattr(
        db_manager, "async_session_maker", lambda: _SesionQueRevienta(), raising=False
    )

    r = await client.get("/health/ready")
    assert r.status_code == 503, "una base caida debe impedir la promocion"
    cuerpo = r.json()
    assert cuerpo["database"] == "error"
    assert cuerpo["status"] == "degraded"


@pytest.mark.asyncio
async def test_liveness_sigue_verde_aunque_la_base_este_caida(client, monkeypatch):
    """La diferencia entre los dos, comprobada.

    Sin esto, alguien podria «arreglar» readiness haciendo que `/health` tambien
    comprobara la base, y entonces un corte transitorio reiniciaria el proceso
    en vez de sacarlo del balanceo.
    """
    from core.database import db_manager

    class _SesionQueRevienta:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return False

        async def execute(self, *_a, **_k):
            raise RuntimeError("could not connect to server")

    monkeypatch.setattr(
        db_manager, "async_session_maker", lambda: _SesionQueRevienta(), raising=False
    )

    r = await client.get("/health")
    assert r.status_code == 200, "liveness no debe depender de la base"
