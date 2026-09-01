"""El ciclo completo de una entrega saliente, contra PostgreSQL real.

POR QUE ESTA BATERIA EXISTE
----------------------------
`webhook_service` citaba CINCO columnas que no existen en la tabla real
—`status`, `attempts`, `response_code`, `last_attempt_at`, `next_retry_at`—
tanto en el `UPDATE` que cierra una entrega como en la consulta que busca cuales
reintentar.

Las dos lanzaban siempre. Consecuencia: ninguna entrega se actualizaba nunca y
**los webhooks salientes no reintentaban**. Un corte de un minuto en el endpoint
de un cliente perdia el evento para siempre, sin un error visible.

POR QUE CONTRA PostgreSQL Y NO CONTRA UN DOBLE
-----------------------------------------------
Un doble de base de datos acepta cualquier nombre de columna. El fallo era
exactamente ese: nombres que no existen. Una prueba con doble habria pasado en
verde con el codigo roto — que es la peor forma de pasar.

El control `test_la_bateria_detecta_la_implementacion_antigua` ejecuta las
consultas ANTERIORES contra el mismo esquema y comprueba que revientan. Sin el,
el verde de aqui no distinguiria «arreglado» de «esta prueba no toca ese camino».

Se salta sin `NELVYON_WEB_CERT_DSN`.
"""
from __future__ import annotations

import json
import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_WEB_CERT_DSN")
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not DSN, reason="requiere PostgreSQL: exporta NELVYON_WEB_CERT_DSN"),
]

MAX_INTENTOS = 3


@pytest.fixture
async def conexion():
    import asyncpg

    c = await asyncpg.connect(DSN.replace("+asyncpg", ""))
    await c.execute("TRUNCATE webhook_deliveries, webhook_endpoints")
    yield c
    await c.close()


@pytest.fixture
async def endpoint(conexion):
    fila = await conexion.fetchrow(
        """INSERT INTO webhook_endpoints (workspace_id, url, events, secret, active)
           VALUES (7, 'https://cliente.example/hook', '["pago.creado"]'::jsonb, 's3cr3t', true)
           RETURNING id""")
    return fila["id"]


async def _entrega(c, endpoint_id, *, intento: int, exito: bool | None, hace_segundos: int = 0):
    """Una fila de entrega como la que deja el servicio tras un intento."""
    return await c.fetchval(
        """INSERT INTO webhook_deliveries
             (id, endpoint_id, workspace_id, event, payload, status_code, response_body,
              success, attempt, created_at)
           VALUES ($1, $2, 7, 'pago.creado', $3::jsonb, $4, $5, $6, $7,
                   NOW() - ($8 || ' seconds')::interval)
           RETURNING id""",
        uuid.uuid4(), endpoint_id, json.dumps({"importe": 100}),
        None if exito is None else (200 if exito else 500),
        None if exito is None else ("ok" if exito else "boom"),
        exito, intento, str(hace_segundos))


#: La consulta de reintentos, tal y como quedo corregida en el servicio.
SELECCION = """
    SELECT d.id, d.endpoint_id, d.event, d.payload,
           d.attempt AS attempts, e.url, e.secret, e.workspace_id
    FROM webhook_deliveries d
    JOIN webhook_endpoints e ON e.id = d.endpoint_id
    WHERE d.success IS NOT TRUE
      AND d.attempt < $1
      AND d.created_at + (LEAST(3600, POWER(2, d.attempt)::int) || ' seconds')::interval <= NOW()
      AND e.workspace_id = $2
      AND e.active IS NOT FALSE
    ORDER BY d.created_at ASC
    LIMIT 50"""


# ═══════════════════════════════════════════════════════════════════════════
# El ciclo: falla → espera → se reintenta → acierta → no vuelve a salir
# ═══════════════════════════════════════════════════════════════════════════


async def test_una_entrega_fallida_queda_pendiente_de_reintento(conexion, endpoint):
    """Antes no: la consulta lanzaba y no seleccionaba nada NUNCA."""
    await _entrega(conexion, endpoint, intento=1, exito=False, hace_segundos=60)
    filas = await conexion.fetch(SELECCION, MAX_INTENTOS, 7)
    assert len(filas) == 1


async def test_el_backoff_se_respeta(conexion, endpoint):
    """Recien fallada NO se reintenta; pasada la espera, si.

    Sin esta distincion el reintento seria inmediato y machacaria un endpoint
    que ya esta caido — que es como se convierte un corte ajeno en un incidente
    propio.
    """
    # intento 2 -> espera 2^2 = 4 segundos
    await _entrega(conexion, endpoint, intento=2, exito=False, hace_segundos=1)
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 7) == []

    await conexion.execute("UPDATE webhook_deliveries SET created_at = NOW() - INTERVAL '30 seconds'")
    assert len(await conexion.fetch(SELECCION, MAX_INTENTOS, 7)) == 1   # control positivo


async def test_una_entrega_con_exito_no_vuelve_a_salir(conexion, endpoint):
    await _entrega(conexion, endpoint, intento=1, exito=True, hace_segundos=600)
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 7) == []


async def test_agotados_los_intentos_deja_de_reintentarse(conexion, endpoint):
    """El tope tiene que cortar: si no, un endpoint muerto se aporrea para siempre."""
    await _entrega(conexion, endpoint, intento=MAX_INTENTOS, exito=False, hace_segundos=99999)
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 7) == []

    # control positivo: con UN intento menos, si sale
    await conexion.execute("UPDATE webhook_deliveries SET attempt = $1", MAX_INTENTOS - 1)
    assert len(await conexion.fetch(SELECCION, MAX_INTENTOS, 7)) == 1


async def test_un_endpoint_desactivado_no_recibe_reintentos(conexion, endpoint):
    """Desactivarlo es la forma que tiene un cliente de decir «para»."""
    await _entrega(conexion, endpoint, intento=1, exito=False, hace_segundos=600)
    await conexion.execute("UPDATE webhook_endpoints SET active = false")
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 7) == []


async def test_no_se_reintentan_entregas_de_otro_inquilino(conexion, endpoint):
    """`nelvyon_web_jobs` salta RLS, asi que el WHERE es todo el aislamiento."""
    await _entrega(conexion, endpoint, intento=1, exito=False, hace_segundos=600)
    assert len(await conexion.fetch(SELECCION, MAX_INTENTOS, 7)) == 1   # control positivo
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 999) == []


# ═══════════════════════════════════════════════════════════════════════════
# El cierre de la entrega
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_cierre_de_una_entrega_persiste_de_verdad(conexion, endpoint):
    """El UPDATE corregido, contra el esquema real.

    Antes citaba cinco columnas inexistentes: lanzaba, y la fila se quedaba
    exactamente como estaba. Una entrega que triunfaba seguia figurando como
    fallida, y el reintento la volvia a mandar.
    """
    ident = await _entrega(conexion, endpoint, intento=1, exito=False, hace_segundos=600)
    await conexion.execute(
        """UPDATE webhook_deliveries
              SET status_code = $2, response_body = $3, success = $4, attempt = $5
            WHERE id = $1""", ident, 200, "ok", True, 2)
    fila = await conexion.fetchrow("SELECT success, attempt, status_code FROM webhook_deliveries WHERE id = $1", ident)
    assert fila["success"] is True
    assert fila["attempt"] == 2
    assert await conexion.fetch(SELECCION, MAX_INTENTOS, 7) == []


# ═══════════════════════════════════════════════════════════════════════════
# El control que hace creible todo lo anterior
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("sql,columna", [
    # `endpoint_id` ESTABA en esta lista, afirmando que no existia. La 593 la
    # crea a proposito, asi que ese caso se ha ido de aqui — y ha bajado a
    # `test_el_endpoint_no_cabe_en_la_columna_del_inquilino`, que reproduce el
    # fallo de verdad en vez de la ausencia de una columna.
    ("SELECT id FROM webhook_deliveries WHERE status IN ('pending','failed')", "status"),
    ("SELECT id FROM webhook_deliveries WHERE attempts < 3", "attempts"),
    ("SELECT id FROM webhook_deliveries WHERE next_retry_at <= NOW()", "next_retry_at"),
    ("UPDATE webhook_deliveries SET last_attempt_at = NOW()", "last_attempt_at"),
])
async def test_la_bateria_detecta_la_implementacion_antigua(conexion, sql, columna):
    """MUTACION. Las consultas ANTERIORES revientan contra el esquema real.

    Sin esto, el verde de arriba no distinguiria «arreglado» de «esta prueba no
    llega a ese camino». Aqui se ejecuta lo que habia y se comprueba que
    PostgreSQL lo rechaza por la columna concreta.
    """
    import asyncpg

    with pytest.raises(asyncpg.exceptions.UndefinedColumnError) as e:
        await conexion.fetch(sql)
    assert columna in str(e.value)


async def test_el_endpoint_no_cabe_en_la_columna_del_inquilino(conexion, endpoint):
    """MUTACION. La forma ANTERIOR de guardar la referencia viola la foranea.

    `webhook_deliveries` sirve a dos subsistemas con padres disjuntos: el SaaS
    por inquilino (`webhooks`) y este, por espacio de trabajo
    (`webhook_endpoints`). El servicio metia el uuid del endpoint en
    `webhook_id`, que la 405 ata a `webhooks`. No fallaba a veces: fallaba
    SIEMPRE, y ninguna entrega llegaba a existir.

    Es un fallo mas profundo que las cinco columnas inexistentes: alinear los
    NOMBRES —que es lo que se intento primero— no cambia a que tabla apunta una
    clave foranea. Por eso hizo falta la 593.
    """
    import asyncpg

    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError) as e:
        await conexion.execute(
            """INSERT INTO webhook_deliveries
                 (id, webhook_id, workspace_id, event, payload, attempt)
               VALUES ($1, $2, 7, 'pago.creado', '{}'::jsonb, 1)""",
            uuid.uuid4(), endpoint)
    assert "webhook_deliveries_webhook_id_fkey" in str(e.value)


async def test_una_entrega_no_puede_quedarse_sin_padre_ni_tener_dos(conexion, endpoint):
    """La 593 exige EXACTAMENTE uno de los dos.

    Sin esta regla la columna nueva no arregla nada: bastaria con dejar las dos
    a NULL para volver a tener entregas huerfanas, que es el estado en el que
    una entrega no se puede reintentar porque no se sabe a donde iba.
    """
    import asyncpg

    with pytest.raises(asyncpg.exceptions.CheckViolationError) as e:
        await conexion.execute(
            """INSERT INTO webhook_deliveries (id, workspace_id, event, payload, attempt)
               VALUES ($1, 7, 'pago.creado', '{}'::jsonb, 1)""", uuid.uuid4())
    assert "webhook_deliveries_un_solo_padre" in str(e.value)
