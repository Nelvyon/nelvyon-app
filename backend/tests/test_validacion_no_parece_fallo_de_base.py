"""Un cuerpo mal formado no puede parecer una caida de la base de datos.

QUE PASO
--------
Al abrir los seis webhooks entrantes que devolvian 401, dos sondas con `{}`
produjeron en produccion cuatro `db.session_error` a nivel ERROR con ocho trazas
de pila. Ninguna respuesta 5xx: las peticiones devolvieron 422, que es lo
correcto. Lo que estaba mal era la ETIQUETA.

`RequestValidationError` atraviesa el generador de `get_db`, y ahi se registraba
como fallo de sesion de base de datos. Es decir: un cliente mandando un JSON
incompleto generaba en los logs algo indistinguible de una base caida.

`StarletteHTTPException` ya estaba exenta —alguien vio el problema para los 404 y
los 401— pero faltaba el caso mas frecuente.

POR QUE IMPORTA MAS DE LO QUE PARECE
------------------------------------
Porque el ruido con la etiqueta equivocada no es ruido: es una pista falsa.
Quien mire los logs a las 3 de la manana vera `db.session_error` y buscara un
problema de base de datos que no existe. Y al reves, y peor: cuando la base falle
de verdad, su error estara mezclado con los de todos los clientes que mandaron
un campo de menos.
"""
from __future__ import annotations

import logging

import pytest


def test_un_error_de_validacion_no_es_un_error_de_base():
    """La funcion que decide, preguntada directamente."""
    from fastapi.exceptions import RequestValidationError

    from core.database import _es_control_de_flujo_http

    e = RequestValidationError([{"type": "missing", "loc": ("body", "from_email")}])
    assert _es_control_de_flujo_http(e), (
        "un cuerpo que no valida se registraria como `db.session_error`")


def test_un_404_tampoco():
    """El caso que ya estaba cubierto. Control de que no se rompio."""
    from starlette.exceptions import HTTPException

    from core.database import _es_control_de_flujo_http

    assert _es_control_de_flujo_http(HTTPException(status_code=404))
    assert _es_control_de_flujo_http(HTTPException(status_code=401))


def test_un_fallo_de_verdad_de_la_base_SI_se_registra():
    """EL CONTROL QUE IMPORTA.

    Una exencion demasiado ancha silenciaria los fallos reales, que es peor que
    el problema que arregla. Un error de base de datos tiene que seguir pasando
    por el camino de ERROR.
    """
    from core.database import _es_control_de_flujo_http

    assert not _es_control_de_flujo_http(RuntimeError("connection reset by peer"))
    assert not _es_control_de_flujo_http(OSError("no route to host"))
    try:
        import asyncpg

        assert not _es_control_de_flujo_http(
            asyncpg.exceptions.InsufficientPrivilegeError("permission denied"))
    except ImportError:  # pragma: no cover
        pass


@pytest.mark.asyncio
async def test_la_ruta_real_devuelve_422_sin_ensuciar_los_logs(client, caplog):
    """De punta a punta: se manda el mismo cuerpo `{}` que produjo el ruido.

    Se comprueba lo que devuelve Y lo que registra. Sin la segunda mitad, esta
    prueba pasaria igual con el defecto puesto: el codigo de respuesta nunca fue
    el problema.
    """
    with caplog.at_level(logging.ERROR):
        r = await client.post("/api/helpdesk/inbound/email", json={})

    assert r.status_code == 422, (
        f"se esperaba 422 por cuerpo incompleto y llego {r.status_code}")

    como_fallo_de_base = [
        rec for rec in caplog.records
        if "db.session_error" in rec.getMessage()
        or "db.session_create_failed" in rec.getMessage()
        or getattr(rec, "event", "") in ("db.session_error", "db.session_create_failed")
    ]
    assert not como_fallo_de_base, (
        f"un cuerpo que no valida se registro como fallo de base de datos: "
        f"{[r.getMessage()[:120] for r in como_fallo_de_base]}. En los logs de "
        f"produccion eso es indistinguible de una base caida.")
