"""Stock y confirmacion de pago de la tienda. Contra PostgreSQL real.

DOS DEFECTOS EN LA MISMA RUTA
-----------------------------
1. **El webhook de pago no era fail-closed.** Decia: si hay secreto y cabecera,
   verifica la firma; si no, `json.loads(payload)` y adelante. Es decir, sin
   `STRIPE_WEBHOOK_SECRET` configurado cualquiera podia enviar un
   `payment_intent.succeeded` inventado y marcar como PAGADO el pedido que
   quisiera, en la tienda de cualquier cliente.

2. **El stock no se descontaba nunca.** Se comprobaba al crear el pedido y ahi
   moria. Dos compras simultaneas de la ultima unidad pasaban las dos: leian el
   mismo stock y ninguna lo reducia. Se vendia lo que no habia.

POR QUE SE DESCUENTA AL PAGAR
-----------------------------
Un pedido creado y no pagado no debe retener inventario: dejaria la tienda sin
stock por carritos abandonados. La unidad deja de estar disponible cuando se
cobra.

POR QUE HACE FALTA POSTGRESQL
-----------------------------
Lo que se certifica aqui es una carrera y una condicion dentro de un `UPDATE`.
SQLite serializa las escrituras a nivel de fichero, asi que alli el codigo roto
tambien pasaria.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid as _uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

WS = 944_001


def _dsn_asyncpg() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def tienda():
    asyncpg = pytest.importorskip("asyncpg")
    conn = await asyncpg.connect(_dsn_asyncpg())
    proyecto, producto = str(_uuid.uuid4()), str(_uuid.uuid4())

    async def limpiar():
        await conn.execute("DELETE FROM os_store_orders WHERE workspace_id = $1", WS)
        await conn.execute("DELETE FROM os_store_products WHERE workspace_id = $1", WS)
        await conn.execute("DELETE FROM os_store_projects WHERE workspace_id = $1", WS)

    await limpiar()
    # El producto tiene clave foranea al proyecto, asi que la tienda tiene que
    # existir primero.
    await conn.execute(
        "INSERT INTO os_store_projects (id, workspace_id, name, store_info, status) "
        "VALUES ($1::uuid, $2, 'Tienda de prueba', '{}'::jsonb, 'ready') "
        "ON CONFLICT (id) DO NOTHING",
        proyecto, WS,
    )
    await conn.execute(
        "INSERT INTO os_store_products "
        "(id, project_id, workspace_id, name, slug, price_cents, stock, is_active) "
        "VALUES ($1::uuid, $2::uuid, $3, 'Ultima unidad', 'ultima', 1000, 1, true)",
        producto, proyecto, WS,
    )
    try:
        yield conn, proyecto, producto
    finally:
        await limpiar()
        await conn.close()


async def _crear_pedido(conn, proyecto: str, producto: str, cantidad: int) -> str:
    pedido = str(_uuid.uuid4())
    await conn.execute(
        "INSERT INTO os_store_orders "
        "(id, project_id, workspace_id, customer_email, items, total_cents, status) "
        "VALUES ($1::uuid, $2::uuid, $3, 'c@test.invalid', $4::jsonb, 1000, 'pending')",
        pedido, proyecto, WS,
        json.dumps([{"product_id": producto, "quantity": cantidad}]),
    )
    return pedido


async def _confirmar(conn, pedido: str) -> bool:
    """La transicion y el descuento, tal y como los hace el servicio."""
    async with conn.transaction():
        fila = await conn.fetchrow(
            "UPDATE os_store_orders SET status = 'paid', updated_at = NOW() "
            "WHERE id = $1::uuid AND status <> 'paid' RETURNING items",
            pedido,
        )
        if fila is None:
            return False
        crudo = fila["items"]
        lineas = json.loads(crudo) if isinstance(crudo, str) else crudo
        for linea in lineas:
            await conn.execute(
                "UPDATE os_store_products SET stock = stock - $1, updated_at = NOW() "
                "WHERE id = $2::uuid AND stock >= $1",
                int(linea["quantity"]), linea["product_id"],
            )
        return True


@requiere_pg
@pytest.mark.asyncio
async def test_el_stock_baja_al_pagar(tienda):
    conn, proyecto, producto = tienda
    pedido = await _crear_pedido(conn, proyecto, producto, 1)
    assert await _confirmar(conn, pedido) is True
    assert await conn.fetchval(
        "SELECT stock FROM os_store_products WHERE id = $1::uuid", producto
    ) == 0


@requiere_pg
@pytest.mark.asyncio
async def test_un_reintento_de_stripe_no_descuenta_dos_veces(tienda):
    """Stripe reintenta. Sin la puerta de estado, el stock se descontaria dos veces.

    Es la razon de que la transicion a `paid` lleve `AND status <> 'paid'` y de
    que el descuento cuelgue de que esa transicion haya ocurrido.
    """
    conn, proyecto, producto = tienda
    pedido = await _crear_pedido(conn, proyecto, producto, 1)
    assert await _confirmar(conn, pedido) is True
    assert await _confirmar(conn, pedido) is False  # el reintento no transiciona
    assert await conn.fetchval(
        "SELECT stock FROM os_store_products WHERE id = $1::uuid", producto
    ) == 0


@requiere_pg
@pytest.mark.asyncio
async def test_dos_compras_simultaneas_no_venden_la_misma_unidad(tienda):
    """La carrera real: la ultima unidad, dos pagos a la vez.

    La condicion `stock >= :qty` va DENTRO del UPDATE. Leer y luego escribir
    dejaria pasar las dos, que es lo que ocurria.
    """
    conn, proyecto, producto = tienda
    asyncpg = pytest.importorskip("asyncpg")
    a = await _crear_pedido(conn, proyecto, producto, 1)
    b = await _crear_pedido(conn, proyecto, producto, 1)

    conn_a = await asyncpg.connect(_dsn_asyncpg())
    conn_b = await asyncpg.connect(_dsn_asyncpg())
    try:
        await asyncio.gather(_confirmar(conn_a, a), _confirmar(conn_b, b))
    finally:
        await conn_a.close()
        await conn_b.close()

    stock = await conn.fetchval(
        "SELECT stock FROM os_store_products WHERE id = $1::uuid", producto
    )
    assert stock == 0, f"el stock quedo en {stock}: se vendio lo que no habia"


@requiere_pg
@pytest.mark.asyncio
async def test_el_stock_nunca_queda_negativo(tienda):
    """Control positivo de la condicion.

    Un pedido de mas unidades de las que hay no puede dejar el stock bajo cero:
    la condicion esta en el UPDATE y simplemente no afecta ninguna fila.
    """
    conn, proyecto, producto = tienda
    pedido = await _crear_pedido(conn, proyecto, producto, 5)  # solo hay 1
    await _confirmar(conn, pedido)
    assert await conn.fetchval(
        "SELECT stock FROM os_store_products WHERE id = $1::uuid", producto
    ) == 1


def test_el_webhook_de_pago_es_fail_closed():
    """Sin secreto NO se procesa. Antes se caia a `json.loads` y se seguia.

    Se lee el codigo por AST para que el test hable del contrato y no de una
    ejecucion concreta: lo que no puede volver es la rama que aceptaba cuerpos
    sin firmar.
    """
    import ast
    from pathlib import Path

    fuente = (
        Path(__file__).resolve().parent.parent
        / "services" / "os_store_builder_service.py"
    ).read_text(encoding="utf-8")

    for nodo in ast.walk(ast.parse(fuente)):
        if isinstance(nodo, ast.AsyncFunctionDef) and nodo.name == "handle_stripe_webhook":
            cuerpo = ast.unparse(nodo)
            break
    else:
        raise AssertionError("handle_stripe_webhook no existe")

    assert "WebhookNoVerificable" in cuerpo, "sin secreto debe cortar, no continuar"
    assert "construct_event" in cuerpo, "la firma debe verificarse con el SDK"
    # La rama que aceptaba el cuerpo sin verificar no puede reaparecer.
    posicion_json = cuerpo.find("json.loads(payload")
    assert posicion_json == -1, (
        "vuelve a haber una rama que interpreta el cuerpo sin verificar la firma"
    )
