"""Una invitacion pendiente NO consume asiento de plan.

POLITICA DE PRODUCTO. Un asiento se consume cuando existe una pertenencia
ACTIVA. Una invitacion que nadie ha aceptado ocupa una fila, no un asiento.

QUE PASABA ANTES, medido leyendo el codigo:

    workspace_management.py:587   INSERT ... status = 'invited'
    billing_usage.py              COUNT(*) sin mirar el estado
    billing_usage.py:308          _build_meter("users", ..., limits["users"])
    _usage_limits                 get_limit(plan_id, "workspace_users")

Es decir: la invitacion entraba como `invited` y el medidor de asientos la
contaba igual. Con 2 activos y 3 invitaciones pendientes el cliente veia «2» en
el producto —`platformDbFallback.ts` SI filtraba— y chocaba con el limite en 5.
Un limite que no podia ver y no podia entender.

POR QUE SE PRUEBAN LAS FUNCIONES REALES Y NO UNA COPIA DE SU SQL. Copiar la
consulta a la prueba mide la copia, no el codigo. Estas dos funciones se
importan tal cual y se ejecutan contra PostgreSQL de verdad.

LO QUE ESTA PRUEBA NO CUBRE, y se dice: el tope `MAX_MIEMBROS_POR_WORKSPACE`
sigue contando TODAS las filas, invitaciones incluidas. Es otro concepto —un
tope anti-abuso, no un asiento— y esta documentado donde se aplica. Si filtrara
por activos se podrian mandar invitaciones sin fin.

COSTE EXTERNO: 0 EUR. Base local, datos sinteticos, se limpia al terminar.
"""
from __future__ import annotations

import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN,
    reason=(
        "sin NELVYON_PG_CERT_DSN: se necesita un PostgreSQL local. "
        "Levantar con `docker compose -f backend/docker-compose.test.yml up -d`."
    ),
)


def _dsn_asyncpg() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_sqlalchemy() -> str:
    d = DSN or ""
    return d if d.startswith("postgresql+asyncpg://") else d.replace("postgresql://", "postgresql+asyncpg://")


#: Lo que cada estado canonico aporta al recuento de asientos.
#:
#: EL CONTRATO ESTA CERRADO. La migracion 590 anadio
#: `CHECK (status IN ('active','invited'))`, asi que los demas estados ya no
#: pueden existir: la base los rechaza al insertar. Antes de la 590 esta lista
#: incluia `expired`, `revoked`, `removed`, `inactive` y `lo_que_sea` — se
#: comprobaba que NO sumaran asiento. Ahora se comprueba algo mas fuerte: que
#: NO SE PUEDAN ESCRIBIR. Ese caso vive en `test_un_estado_inventado_se_rechaza`.
CASOS = [
    ("active", 1, "una pertenencia activa SI consume asiento"),
    ("invited", 0, "una invitacion pendiente NO consume asiento"),
]


@pytest.fixture
async def sesion():
    """Una sesion contra la base local, con su workspace de usar y tirar."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy import text

    motor = create_async_engine(_dsn_sqlalchemy(), pool_size=2, max_overflow=0)
    Sesion = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    ws_id = None
    async with Sesion() as s:
        # Un workspace propio para no tocar nada de nadie.
        fila = await s.execute(
            text(
                "INSERT INTO workspaces (user_id, name, slug, status, plan, created_at) "
                "VALUES (:u, 'prueba asientos', :slug, 'active', 'starter', NOW()) RETURNING id"
            ),
            {"u": str(uuid.uuid4()), "slug": f"asientos-{uuid.uuid4().hex[:8]}"},
        )
        ws_id = int(fila.scalar_one())
        await s.commit()
        try:
            yield s, ws_id
        finally:
            await s.execute(text("DELETE FROM workspace_members WHERE workspace_id = :w"), {"w": ws_id})
            await s.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
            await s.commit()
    await motor.dispose()


async def _mete(s, ws_id: int, estado: str) -> None:
    from sqlalchemy import text

    await s.execute(
        text(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at) "
            "VALUES (:w, :u, :e, 'member', :st, NOW()::text)"
        ),
        {
            "w": ws_id,
            "u": str(uuid.uuid4()),
            "e": f"{uuid.uuid4().hex[:8]}@ejemplo.test",
            "st": estado,
        },
    )
    await s.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize("estado,esperado,porque", CASOS)
async def test_un_estado_solo_cuenta_si_esta_activo(sesion, estado, esperado, porque):
    """LA REGLA, caso a caso: solo `active` consume asiento."""
    from routers.billing_usage import _count_workspace_members as asientos_facturables

    s, ws_id = sesion
    await _mete(s, ws_id, estado)
    assert await asientos_facturables(s, ws_id) == esperado, porque


@pytest.mark.asyncio
async def test_el_caso_completo_que_lo_motivo(sesion):
    """Dos activos y tres invitaciones: el plan debe ver DOS, no cinco."""
    from routers.billing_usage import _count_workspace_members as asientos_facturables

    s, ws_id = sesion
    for _ in range(2):
        await _mete(s, ws_id, "active")
    for _ in range(3):
        await _mete(s, ws_id, "invited")

    assert await asientos_facturables(s, ws_id) == 2, (
        "el cliente ve 2 miembros y el plan le cobraba 5 asientos"
    )


@pytest.mark.asyncio
async def test_la_api_de_workspaces_cuenta_lo_mismo(sesion):
    """Las dos implementaciones tienen que decir el MISMO numero.

    Eran cuatro formas distintas de contar lo mismo. Esta prueba fija que las
    dos de Python no vuelvan a separarse.
    """
    from routers.billing_usage import _count_workspace_members as de_facturacion
    from routers.workspace_management import _count_workspace_members as de_la_api

    s, ws_id = sesion
    await _mete(s, ws_id, "active")
    await _mete(s, ws_id, "invited")
    await _mete(s, ws_id, "invited")

    assert await de_facturacion(s, ws_id) == 1
    assert await de_la_api(s, ws_id) == 1


@pytest.mark.asyncio
async def test_el_control_un_workspace_vacio_no_consume_nada(sesion):
    """EL CONTROL. Sin esto, «devolver siempre 0» pasaria todo lo de arriba."""
    from routers.billing_usage import _count_workspace_members as asientos_facturables

    s, ws_id = sesion
    assert await asientos_facturables(s, ws_id) == 0

    # Y con un activo, sube. Es lo que distingue contar de devolver cero.
    await _mete(s, ws_id, "active")
    assert await asientos_facturables(s, ws_id) == 1


@pytest.mark.asyncio
async def test_el_recuento_es_por_workspace_y_no_global(sesion):
    """Un miembro de OTRO workspace no consume asientos de este.

    Sin el filtro por workspace, el recuento seria global y todos los clientes
    compartirian el limite. Es la comprobacion de aislamiento del recuento.
    """
    from sqlalchemy import text
    from routers.billing_usage import _count_workspace_members as asientos_facturables

    s, ws_id = sesion
    otro = await s.execute(
        text(
            "INSERT INTO workspaces (user_id, name, slug, status, plan, created_at) "
            "VALUES (:u, 'otro', :slug, 'active', 'starter', NOW()) RETURNING id"
        ),
        {"u": str(uuid.uuid4()), "slug": f"otro-{uuid.uuid4().hex[:8]}"},
    )
    otro_id = int(otro.scalar_one())
    await s.commit()
    try:
        await _mete(s, otro_id, "active")
        assert await asientos_facturables(s, ws_id) == 0, "cuenta miembros de otro workspace"
    finally:
        await s.execute(text("DELETE FROM workspace_members WHERE workspace_id = :w"), {"w": otro_id})
        await s.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": otro_id})
        await s.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize("inventado", ["expired", "revoked", "removed", "inactive", "activo", "Active", "", "lo_que_sea"])
async def test_un_estado_inventado_se_rechaza(sesion, inventado):
    """LA REGLA DEL CONTRATO: la base no admite un estado que no exista.

    La migracion 590 cerro `workspace_members.status` a `('active','invited')`.
    Antes admitia cualquier cadena, y eso importa mas de lo que parece: hay 42
    sitios en el codigo que filtran por `= 'active'`. Un `activo` en castellano,
    un `Active` con mayuscula o un `activated` de una integracion quedarian
    FUERA de los 42 filtros. El miembro existiria y nadie lo contaria.

    Se prueban las dos formas de equivocarse que mas se ven: el estado en otro
    idioma y el mismo estado con otra caja.
    """
    from sqlalchemy.exc import DBAPIError, IntegrityError

    s, ws_id = sesion
    with pytest.raises((IntegrityError, DBAPIError)):
        await _mete(s, ws_id, inventado)
    await s.rollback()


@pytest.mark.asyncio
async def test_el_control_los_dos_canonicos_si_entran(sesion):
    """EL CONTROL. Sin esto, un CHECK que lo rechazara TODO pasaria la prueba
    de arriba y dejaria el producto sin poder dar de alta a nadie."""
    from routers.billing_usage import _count_workspace_members as asientos_facturables

    s, ws_id = sesion
    await _mete(s, ws_id, "active")
    await _mete(s, ws_id, "invited")
    assert await asientos_facturables(s, ws_id) == 1
