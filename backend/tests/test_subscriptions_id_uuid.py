"""El identificador de `subscriptions` es un `uuid`, y el codigo lo trata como tal.

EL FALLO QUE ESTO IMPIDE
------------------------
La columna es `uuid DEFAULT gen_random_uuid()` desde su creacion. El modelo ORM la
declaraba `Integer` autoincremental, el modelo de respuesta `id: int`, los
parametros de ruta `id: int` y cuatro firmas del servicio `obj_id: int`.

Nada de eso fallaba porque `subscriptions` esta VACIA en produccion. En cuanto se
registre la primera suscripcion:

  * `GET /api/v1/entities/subscriptions` no valida la respuesta y devuelve error;
  * `GET|PUT|DELETE /api/v1/entities/subscriptions/{id}` da 422, porque un uuid no
    es un entero.

Es exactamente el mismo reparto de sintomas que tenia `/api/v1/os/clients`: sano
mientras no hay datos, roto en cuanto los hay. Y aqui la tabla que se estrena es
la del cobro.

QUE SE ALINEO, Y EN QUE DIRECCION
---------------------------------
Al esquema, no al reves. El tipo fisico de produccion no se toca: `uuid` es la
forma canonica y lleva siendolo desde el principio. Lo que se corrige es el codigo
que decia otra cosa.
"""
from __future__ import annotations

import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def conexion():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn())
    try:
        yield c
    finally:
        await c.close()


@pytest.fixture
async def titular(conexion):
    """Un usuario y su workspace: ambas columnas son NOT NULL."""
    marca = uuid.uuid4().hex[:8]
    uid = await conexion.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Cert UUID') RETURNING user_id",
        f"cert-uuid-{marca}@nelvyon.test",
    )
    ws = await conexion.fetchval(
        "INSERT INTO workspaces (user_id, name) VALUES ($1,$2) RETURNING id",
        str(uid), f"ws-uuid-{marca}",
    )
    try:
        yield {"uid": uid, "ws": int(ws)}
    finally:
        await conexion.execute("DELETE FROM subscriptions WHERE workspace_id=$1", ws)
        await conexion.execute("DELETE FROM workspaces WHERE id=$1", ws)
        await conexion.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)


# ── el esquema canonico, dicho por la base ──────────────────────────────────


async def test_la_columna_es_uuid_en_postgresql(conexion):
    """Control de la premisa: si esto cambiara, el resto de la bateria mide otra
    cosa y habria que revisar la direccion del alineamiento."""
    tipo = await conexion.fetchval(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='subscriptions' AND column_name='id'")
    assert tipo == "uuid"


async def test_el_modelo_orm_declara_el_mismo_tipo():
    """EL FALLO EXACTO: declaraba `Integer` sobre una columna `uuid`."""
    from models.subscriptions import Subscriptions

    columna = Subscriptions.__table__.c.id
    assert columna.type.python_type is uuid.UUID, (
        f"el ORM declara {columna.type!r} sobre una columna uuid: al leer entrega "
        f"un objeto UUID y cualquier consumidor tipado como entero lo rechaza"
    )


# ── ciclo completo: alta, lectura, busqueda por id, modificacion ────────────


async def test_alta_lectura_busqueda_y_modificacion_por_id_real(conexion, titular):
    """El recorrido que hace el webhook de Stripe, con el id que devuelve la base."""
    ident = await conexion.fetchval(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, status) "
        "VALUES ($1,$2,'pro','monthly','active') RETURNING id",
        titular["ws"], titular["uid"],
    )
    assert isinstance(ident, uuid.UUID), "la base no devolvio un uuid"

    fila = await conexion.fetchrow("SELECT * FROM subscriptions WHERE id=$1", ident)
    assert fila is not None, "no se encuentra por su propio id"
    assert fila["plan_id"] == "pro"

    afectadas = await conexion.execute(
        "UPDATE subscriptions SET status='canceled' WHERE id=$1", ident)
    assert afectadas.endswith(" 1"), f"el UPDATE por id no afecto a una fila: {afectadas}"

    assert await conexion.fetchval(
        "SELECT status FROM subscriptions WHERE id=$1", ident) == "canceled"


async def test_el_id_generado_no_es_secuencial(conexion, titular):
    """Dos altas dan identificadores no adivinables.

    Con `Integer` autoincremental un tercero podria enumerar suscripciones ajenas
    por id. Es una propiedad del esquema que conviene dejar fijada.

    Hacen falta dos titulares distintos: `subscriptions.user_id` tiene restriccion
    UNIQUE, o sea una suscripcion por usuario. Ese detalle no estaba escrito en
    ninguna parte y se descubrio al escribir esta prueba.
    """
    marca = uuid.uuid4().hex[:8]
    otro_uid = await conexion.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Cert UUID 2') RETURNING user_id",
        f"cert-uuid2-{marca}@nelvyon.test",
    )
    try:
        ids = []
        for uid in (titular["uid"], otro_uid):
            ids.append(await conexion.fetchval(
                "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
                "billing_cycle, status) VALUES ($1,$2,'pro','monthly','active') "
                "RETURNING id",
                titular["ws"], uid))
        assert ids[0] != ids[1]
        assert all(isinstance(i, uuid.UUID) for i in ids)
    finally:
        await conexion.execute("DELETE FROM subscriptions WHERE user_id=$1", otro_uid)
        await conexion.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro_uid)


async def test_un_titular_no_puede_tener_dos_suscripciones(conexion, titular):
    """La restriccion UNIQUE sobre `user_id`, fijada donde se pueda leer.

    Importa para el webhook de Stripe: un segundo `checkout.session.completed` del
    mismo usuario no crea una fila nueva, falla. El procesador ya lo contempla
    —busca antes y actualiza— pero conviene que la propiedad este probada.
    """
    asyncpg = pytest.importorskip("asyncpg")
    await conexion.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'pro','monthly','active')",
        titular["ws"], titular["uid"])
    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await conexion.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
            "status) VALUES ($1,$2,'enterprise','annual','active')",
            titular["ws"], titular["uid"])


# ── el contrato HTTP acepta lo que la base devuelve ─────────────────────────


def test_la_respuesta_acepta_un_uuid_y_publica_una_cadena():
    """Antes `id: int` rechazaba el uuid y la ruta no podia responder."""
    from routers.subscriptions import SubscriptionsResponse

    campo = SubscriptionsResponse.model_fields["id"]
    assert campo.annotation is str, "el contrato publicado debe seguir siendo una cadena"
    assert any(type(m).__name__ == "BeforeValidator" for m in campo.metadata), (
        "el campo no acepta un UUID de PostgreSQL"
    )


def test_los_parametros_de_ruta_ya_no_exigen_un_entero():
    """`GET /{id}` con `id: int` daba 422 ante un uuid: la fila era inalcanzable."""
    import inspect

    from routers import subscriptions as mod

    for nombre in ("get_subscriptions_by_id", "update_subscriptions", "delete_subscriptions"):
        fn = getattr(mod, nombre, None)
        if fn is None:
            continue
        anotacion = inspect.signature(fn).parameters["id"].annotation
        assert anotacion is not int, (
            f"{nombre} sigue exigiendo un entero: un uuid daria 422"
        )


def test_las_firmas_del_servicio_no_prometen_un_entero():
    import inspect

    from services.subscriptions import SubscriptionsService

    for nombre in ("check_ownership", "get_by_id", "update", "delete"):
        fn = getattr(SubscriptionsService, nombre)
        anotacion = inspect.signature(fn).parameters["obj_id"].annotation
        assert anotacion is not int, f"SubscriptionsService.{nombre} sigue tipado int"
