"""`REDIS_URL` apunta a algo alcanzable, o no se configura.

EL FALLO QUE ESTO IMPIDE
------------------------
Produccion llevaba tiempo con `REDIS_URL` apuntando a `localhost:6379`. En
Railway cada servicio corre en su propio contenedor, asi que ahi no hay ningun
Redis escuchando: la conexion fallaba en cada arranque y el adaptador caia al
almacen en memoria.

Lo malo no era la degradacion —esta certificada y es segura— sino que la
configuracion MENTIA. `REDIS_URL` presente significa «hay Redis»: readiness
informaba `degraded_memory`, que se lee como «lo hubo y se cayo», cuando la
verdad era «nunca pudo haberlo». Un operador que viera eso buscaria una averia
inexistente en vez de leer «no configurado».

La variable se retiro y readiness pasa a decir `not_configured`. Este guard
impide que vuelva.

QUE COMPRUEBA
-------------
Que ninguna configuracion del repositorio proponga un Redis en `localhost` para
un entorno desplegado, y que la degradacion sin Redis siga siendo la certificada.

LO QUE NO COMPRUEBA
-------------------
Si existe o no un Redis de verdad: eso depende de aprovisionar un recurso de
pago y queda fuera del codigo. La aplicacion esta preparada para aceptar una
`REDIS_URL` real el dia que exista, sin ningun otro cambio.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
REPO = RAIZ.parent

#: Un Redis en localhost solo tiene sentido en desarrollo o en la propia maquina
#: de test. En un despliegue es siempre un error.
_LOCALHOST = re.compile(r"redis://(localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]")

#: Ficheros donde `redis://localhost` es correcto y esperado.
#:
#: Son de dos clases: composiciones que LEVANTAN el Redis en la misma maquina
#: —ahi localhost es la direccion correcta— y plantillas de ejemplo que nadie
#: despliega. Ninguna llega a un contenedor de Railway.
_PERMITIDOS = {
    "backend/local-ai/docker-compose.yml",
    "backend/docker-compose.test.yml",
    "docker-compose.yml",
    ".env.example",
    "apps/web/.env.example",
    "backend/tests/test_redis_configuracion_util.py",
}

#: Directorios que no se recorren. Sin esto el barrido tardaba dos minutos y
#: medio recorriendo dependencias.
_IGNORADOS = {"node_modules", ".next", ".git", "dist", "build", ".venv", "venv", "__pycache__"}


def _configuraciones():
    """Ficheros de configuracion del repositorio, sin bajar a dependencias."""
    sufijos = {".yml", ".yaml", ".toml", ".json", ".example"}

    def recorrer(directorio: Path):
        for hijo in directorio.iterdir():
            if hijo.is_dir():
                if hijo.name in _IGNORADOS:
                    continue
                yield from recorrer(hijo)
            elif hijo.suffix in sufijos or hijo.name.startswith("Dockerfile") or hijo.name.endswith(".env.example"):
                yield hijo

    yield from recorrer(REPO)


def test_el_barrido_ve_configuraciones():
    """Control positivo: un glob roto daria verde con cero ficheros."""
    assert len(list(_configuraciones())) > 10


def test_ninguna_configuracion_desplegable_apunta_a_un_redis_local():
    """El fallo exacto: `redis://localhost:6379` en un entorno de Railway."""
    culpables = []
    for f in _configuraciones():
        rel = f.relative_to(REPO).as_posix()
        if rel in _PERMITIDOS:
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        if _LOCALHOST.search(texto):
            culpables.append(rel)
    assert not culpables, (
        f"configuraciones que proponen un Redis en localhost: {culpables}. "
        "En un contenedor desplegado no hay nada escuchando ahi: la conexion "
        "falla y readiness informa 'degraded_memory' cuando la verdad es "
        "'not_configured'. O se apunta a un Redis real, o no se configura."
    )


def test_el_detector_reconoce_la_url_que_estaba_en_produccion():
    """Control negativo: sin esto un regex roto daria verde."""
    assert _LOCALHOST.search("REDIS_URL=redis://localhost:6379/0")
    assert _LOCALHOST.search("redis://127.0.0.1:6379")
    # y no marca una URL real
    assert not _LOCALHOST.search("redis://default:x@redis-prod.railway.internal:6379")


# ── la degradacion sigue siendo la certificada ──────────────────────────────

def test_sin_redis_el_estado_es_no_configurado_y_dice_que_se_pierde(monkeypatch):
    """`not_configured` es distinto de `degraded_memory`, y la diferencia importa:
    uno dice «no lo hay» y el otro «lo habia y fallo»."""
    monkeypatch.delenv("REDIS_URL", raising=False)
    import main

    estado = main._estado_de_redis()
    assert estado["state"] == "not_configured"
    assert estado["impact"], "un estado sin consecuencia declarada no informa"


def test_redis_nunca_es_dependencia_requerida_sin_decidirlo(monkeypatch):
    """`optional` decide que su caida NO tumbe readiness.

    Si alguien lo pasara a `required` sin mas, un despliegue sin Redis dejaria
    de promocionarse. Que sea una decision explicita y no un descuido.
    """
    monkeypatch.delenv("REDIS_URL", raising=False)
    fuente = (RAIZ / "main.py").read_text(encoding="utf-8")
    assert '"redis": {"criticality": "optional"' in fuente, (
        "Redis ha pasado a REQUIRED. Eso solo es correcto si el API se escala a "
        "varios procesos o replicas — con uno solo, pub/sub y estado de OAuth en "
        "memoria son coherentes. Revisa `_estado_de_redis` y este test."
    )


@pytest.mark.asyncio
async def test_el_limitador_sigue_denegando_si_su_almacen_falla(monkeypatch):
    """La propiedad que no puede perderse al tocar nada de Redis.

    Se repite aqui, y no solo en `test_redis_opcional_degradacion.py`, porque es
    la unica que convierte «Redis opcional» en algo aceptable: si al caerse el
    almacen se dejara pasar, «opcional» significaria «sin limitador».
    """
    from middleware import rate_limit as rl

    class _Cabeceras(dict):
        def get(self, k, d=None):
            for kk, vv in self.items():
                if kk.lower() == k.lower():
                    return vv
            return d

    class _Peticion:
        headers = _Cabeceras()
        cookies: dict = {}
        client = type("C", (), {"host": "203.0.113.77"})()
        url = type("U", (), {"path": "/api/v1/algo"})()
        method = "GET"

    class _AlmacenCaido:
        async def check_rate_limit(self, *_a, **_k):
            raise ConnectionError("Redis unavailable")

    monkeypatch.setenv("ENVIRONMENT", "production")
    medio = rl.IntelligentRateLimitMiddleware(app=None, enabled=True)
    medio._redis = _AlmacenCaido()

    async def siguiente(_req):
        raise AssertionError("el limitador tenia que denegar, no dejar pasar")

    respuesta = await medio.dispatch(_Peticion(), siguiente)
    assert respuesta.status_code == 429


def test_que_pasa_al_escalar_esta_escrito():
    """Con varios procesos, pub/sub y estado de OAuth en memoria dejan de ser
    coherentes y Redis pasa a REQUIRED. Tiene que estar dicho donde se lea, no
    descubrirse el dia del incidente."""
    fuente = (RAIZ / "main.py").read_text(encoding="utf-8")
    assert "REQUIRED" in fuente and "replicas" in fuente, (
        "falta la advertencia de que escalar horizontalmente convierte Redis en "
        "dependencia requerida"
    )
