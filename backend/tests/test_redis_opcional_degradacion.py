"""Redis es OPCIONAL, y la degradacion esta acotada y comprobada.

LA PREGUNTA QUE ESTO RESPONDE
-----------------------------
Produccion arranca con `Redis connection failed: Error 111 connecting to
localhost:6379` y sigue sirviendo. ¿Es una averia que nadie ha visto o una
dependencia que no hacia falta?

Se trazaron TODOS los consumidores del adaptador. Cada uno degrada; ninguno
falla:

    limitador       cuenta por proceso en vez de global
    colas           `QueueService` encola y desencola en memoria
    cache           por proceso, solo menos eficaz
    pub/sub chat    canales en memoria
    estado OAuth    en memoria, con su TTL

Los dos ultimos solo son correctos con UN proceso. Hoy lo es —el API arranca
`uvicorn` sin `--workers` y sin replicas declaradas—, de modo que la conclusion
es OPCIONAL. Si algun dia se escala horizontalmente, Redis pasa a REQUIRED.

LO QUE NO PUEDE PASAR NUNCA
---------------------------
Que la caida de Redis se convierta en barra libre. El limitador forma parte de
la proteccion del API, y si su almacen no responde tiene que DENEGAR, no dejar
pasar. Esa es la propiedad principal de este fichero, y se comprueba con el
fallo simulado en la propia consulta.
"""
from __future__ import annotations

import os

import pytest

from middleware import rate_limit as rl


class _Cabeceras(dict):
    def get(self, clave, defecto=None):
        for k, v in self.items():
            if k.lower() == clave.lower():
                return v
        return defecto


class _Cliente:
    def __init__(self, host):
        self.host = host


class _Peticion:
    def __init__(self, ruta="/api/v1/algo", cabeceras=None, host="203.0.113.40"):
        self.headers = _Cabeceras(cabeceras or {})
        self.cookies = {}
        self.client = _Cliente(host)
        self.url = type("U", (), {"path": ruta})()
        self.method = "GET"


class _AlmacenQueRevienta:
    async def check_rate_limit(self, *_a, **_k):
        raise ConnectionError("Redis unavailable")


class _AlmacenQuePermite:
    async def check_rate_limit(self, *_a, **_k):
        return {"allowed": True, "reset_in": 60}


@pytest.mark.asyncio
async def test_si_el_almacen_del_limitador_falla_se_deniega(monkeypatch):
    """LA propiedad. Un fallo de infraestructura no puede abrir la puerta.

    Se simula el fallo en la CONSULTA, no en la configuracion: es el caso real
    —Redis configurado pero inalcanzable— y el unico que distingue un
    fail-closed de verdad de uno que solo funciona cuando falta la variable.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    medio = rl.IntelligentRateLimitMiddleware(app=None, enabled=True)
    medio._redis = _AlmacenQueRevienta()

    async def siguiente(_req):
        raise AssertionError("no debe llegar al endpoint: el limitador tenia que denegar")

    respuesta = await medio.dispatch(_Peticion(), siguiente)
    assert respuesta.status_code == 429
    assert "Retry-After" in respuesta.headers


@pytest.mark.asyncio
async def test_con_almacen_sano_la_peticion_pasa(monkeypatch):
    """Control positivo: sin esto, un limitador que denegara SIEMPRE tambien
    pasaria el test anterior, y seria una averia distinta disfrazada de virtud.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    medio = rl.IntelligentRateLimitMiddleware(app=None, enabled=True)
    medio._redis = _AlmacenQuePermite()

    class _Resp:
        def __init__(self):
            self.headers = {}

    llamado = {"si": False}

    async def siguiente(_req):
        llamado["si"] = True
        return _Resp()

    await medio.dispatch(_Peticion(), siguiente)
    assert llamado["si"], "con almacen sano la peticion debe llegar al endpoint"


@pytest.mark.asyncio
async def test_el_respaldo_en_memoria_cuenta_de_verdad():
    """El fallback no es un colador: cuenta y llega a denegar.

    Si el respaldo dejara pasar todo, «Redis opcional» seria en realidad
    «sin limitador», que es exactamente lo que no se puede aceptar.
    """
    # Se usa el ADAPTADOR con el respaldo activo, no el almacen suelto: la
    # cuenta la lleva `RedisAdapter.check_rate_limit`, que es el camino real
    # cuando Redis no responde.
    from core.redis_adapter import RedisAdapter

    almacen = RedisAdapter()
    almacen._using_redis = False
    permitidas = 0
    for _ in range(15):
        r = await almacen.check_rate_limit("clave:de:prueba", 10, 60)
        if r["allowed"]:
            permitidas += 1
    assert permitidas == 10, f"el respaldo permitio {permitidas}, deberia cortar en 10"


@pytest.mark.asyncio
async def test_la_ventana_del_respaldo_expira():
    """Y no bloquea para siempre: sin expiracion, diez peticiones dejarian a un
    cliente fuera de por vida."""
    from core.redis_adapter import RedisAdapter

    almacen = RedisAdapter()
    almacen._using_redis = False
    for _ in range(12):
        await almacen.check_rate_limit("clave:ventana", 10, 1)
    assert (await almacen.check_rate_limit("clave:ventana", 10, 1))["allowed"] is False

    import asyncio

    await asyncio.sleep(1.2)
    assert (await almacen.check_rate_limit("clave:ventana", 10, 1))["allowed"] is True


# ── la criticidad viaja con el estado ───────────────────────────────────────

def test_readiness_declara_la_criticidad_de_cada_dependencia(monkeypatch):
    """Un Redis caido y una base caida no son la misma noticia.

    Antes readiness devolvia `redis: <estado>` a secas y quien leyera tenia que
    saberse de memoria si eso era grave. Ahora la criticidad va al lado.
    """
    monkeypatch.delenv("REDIS_URL", raising=False)
    import main

    estado = main._estado_de_redis()
    assert estado["state"] == "not_configured"
    assert "impact" in estado, "un estado sin consecuencia declarada no informa de nada"


def test_redis_degradado_declara_que_se_pierde(monkeypatch):
    """`degraded` sin decir QUE se degrada es un adorno."""
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    import main

    estado = main._estado_de_redis()
    assert estado["state"] in ("degraded_memory", "ok", "unknown")
    if estado["state"] == "degraded_memory":
        assert estado["impact"] and "reinici" in estado["impact"].lower()
