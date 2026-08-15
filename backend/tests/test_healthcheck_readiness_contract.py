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

POR QUE ESTE TEST BARRE EN VEZ DE MIRAR UNA LISTA
-------------------------------------------------
La primera version comprobaba dos ficheros escritos a mano —`backend/railway.json`
y `railway.backend.json`— y daba verde. Pero el repo tiene SIETE configuraciones
de Railway, y la que el servicio API carga de verdad es una tercera:
`backend/railway.toml`. Se sabe porque los despliegues de staging lo registran:

    "configFile": "/backend/railway.toml"

Esa seguia diciendo `/health`. El arreglo estaba en los dos ficheros que nadie
lee y ausente del unico que decide. Un test verde sobre una lista incompleta es
peor que no tenerlo, asi que ahora se descubren los ficheros por barrido y se
comprueba que el conjunto encontrado es el esperado: anadir una configuracion
nueva sin declararla aqui rompe el test.
"""
from __future__ import annotations

import json
import tomllib
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

RAIZ = Path(__file__).resolve().parent.parent
REPO = RAIZ.parent

#: Cada servicio con las configuraciones que puede cargar y el healthcheck que
#: le corresponde. El API comprueba la base porque su readiness la necesita; el
#: web usa liveness (su readiness depende del API, y encadenarlos haria que una
#: caida del API impidiera desplegar el frontend).
SERVICIOS = {
    "api": {
        "esperado": "/health/ready",
        "configs": ("backend/railway.json", "backend/railway.toml", "railway.backend.json"),
    },
    "web": {
        "esperado": "/api/health/live",
        "configs": ("railway.json", "railway.toml", "apps/web/railway.json", "apps/web/railway.toml"),
    },
}

TODAS = tuple(sorted(c for s in SERVICIOS.values() for c in s["configs"]))


def _healthcheck(rel: str) -> str | None:
    """El `deploy.healthcheckPath` de una configuracion, sea JSON o TOML."""
    ruta = REPO / rel
    texto = ruta.read_text(encoding="utf-8")
    datos = tomllib.loads(texto) if ruta.suffix == ".toml" else json.loads(texto)
    return (datos.get("deploy") or {}).get("healthcheckPath")


def _configs_en_el_repo() -> set[str]:
    """Las que existen de verdad, descubiertas, no listadas."""
    encontradas = set()
    for patron in ("railway*.json", "railway*.toml"):
        for ruta in list(REPO.glob(patron)) + list(REPO.glob(f"*/{patron}")) + list(
            REPO.glob(f"*/*/{patron}")
        ):
            if "node_modules" in ruta.parts or ".next" in ruta.parts:
                continue
            encontradas.add(ruta.relative_to(REPO).as_posix())
    return encontradas


def test_no_hay_configuraciones_de_railway_sin_vigilar():
    """El fallo que esto impide: una config que nadie mira y que Railway si lee.

    Si aparece un `railway.toml` nuevo en otro directorio, este test lo dice.
    Sin esto, el resto de comprobaciones pueden estar verdes sobre el fichero
    equivocado — que es exactamente lo que paso.
    """
    sin_vigilar = _configs_en_el_repo() - set(TODAS)
    assert not sin_vigilar, (
        "configuraciones de Railway que ningun test comprueba: "
        f"{sorted(sin_vigilar)} — anadelas a SERVICIOS con su healthcheck"
    )


def test_las_configuraciones_declaradas_existen():
    """Control inverso: si una se renombra, el barrido no debe quedar hueco."""
    faltan = [c for c in TODAS if not (REPO / c).exists()]
    assert not faltan, f"declaradas pero inexistentes: {faltan}"


@pytest.mark.parametrize(
    "servicio,config",
    [(s, c) for s, d in SERVICIOS.items() for c in d["configs"]],
    ids=lambda v: v.replace("/", "_"),
)
def test_cada_configuracion_apunta_al_healthcheck_de_su_servicio(servicio, config):
    """Si el API vuelve a `/health`, vuelve a promocionarse un despliegue roto."""
    esperado = SERVICIOS[servicio]["esperado"]
    assert _healthcheck(config) == esperado, (
        f"{config} ({servicio}) apunta a un healthcheck que no es {esperado}"
    )


@pytest.mark.parametrize("servicio", sorted(SERVICIOS))
def test_todas_las_configuraciones_de_un_servicio_dicen_lo_mismo(servicio):
    """Railway carga una u otra segun como este montado el servicio.

    Si se separan, el healthcheck real depende de un detalle del panel, que es
    exactamente el tipo de cosa que nadie revisa hasta que falla.
    """
    rutas = {c: _healthcheck(c) for c in SERVICIOS[servicio]["configs"]}
    assert len(set(rutas.values())) == 1, f"configuraciones divergentes: {rutas}"


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
