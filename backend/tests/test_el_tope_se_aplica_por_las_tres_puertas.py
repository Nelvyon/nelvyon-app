"""El tope anti-abuso se aplicaba por una puerta y habia tres.

QUE PASABA, medido leyendo el codigo:

    workspace_management.invite       SI aplica MAX_MIEMBROS_POR_WORKSPACE,
                                      y ademas de forma atomica: FOR UPDATE
                                      sobre el workspace e INSERT ... WHERE
                                      count < tope.

    POST /entities/workspace_members         NO lo aplicaba.
    POST /entities/workspace_members/batch   NO lo aplicaba.

Las dos ultimas las monta `main.py` por descubrimiento automatico igual que
todas las demas, asi que estaban vivas y alcanzables. Un operador del workspace
podia crear pertenencias sin limite; por el batch, tantas como cupieran en una
peticion.

NO ES UN CAMBIO DE FACTURACION. El tope cuenta FILAS —invitaciones incluidas— y
no asientos, precisamente para que no dependa de lo que se cobra. Un asiento lo
consume una pertenencia `active`; eso lo gobierna `billing_usage` y no se toca
aqui. Lo unico que cambia es que el tope se aplica por las tres puertas.

POR QUE SE PRUEBA CONTRA POSTGRESQL DE VERDAD. Lo que puede fallar aqui es una
carrera: dos peticiones que cuentan 49 a la vez y las dos deciden que caben. Un
doble de base no tiene bloqueos de fila, asi que aprobaria con el codigo roto.

COSTE EXTERNO: 0 EUR. Base local, datos sinteticos, se limpia al terminar.
"""
from __future__ import annotations

import asyncio
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


def _dsn_sqlalchemy() -> str:
    # `asyncpg` no entiende `sslmode`: es un parametro de libpq. Si viene en el
    # DSN, `connect()` revienta con «unexpected keyword argument». Se quita aqui
    # para que la prueba funcione con cualquiera de las dos formas del DSN.
    d = (DSN or "").split("?", 1)[0]
    return d if d.startswith("postgresql+asyncpg://") else d.replace("postgresql://", "postgresql+asyncpg://")


@pytest.fixture
async def entorno():
    """Un workspace propio y una fabrica de sesiones contra la base local."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    motor = create_async_engine(_dsn_sqlalchemy(), pool_size=5, max_overflow=0)
    Sesion = async_sessionmaker(motor, class_=AsyncSession, expire_on_commit=False)
    async with Sesion() as s:
        fila = await s.execute(
            text(
                "INSERT INTO workspaces (user_id, name, slug, status, plan, created_at) "
                "VALUES (:u, 'tope', :slug, 'active', 'starter', NOW()) RETURNING id"
            ),
            {"u": str(uuid.uuid4()), "slug": f"tope-{uuid.uuid4().hex[:8]}"},
        )
        ws = int(fila.scalar_one())
        await s.commit()
    try:
        yield Sesion, ws
    finally:
        async with Sesion() as s:
            await s.execute(text("DELETE FROM workspace_members WHERE workspace_id = :w"), {"w": ws})
            await s.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws})
            await s.commit()
        await motor.dispose()


async def _llena(Sesion, ws: int, cuantas: int) -> None:
    """Mete `cuantas` pertenencias por SQL directo, saltandose las rutas."""
    from sqlalchemy import text

    async with Sesion() as s:
        for _ in range(cuantas):
            await s.execute(
                text(
                    "INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at) "
                    "VALUES (:w, :u, :e, 'member', 'invited', NOW()::text)"
                ),
                {"w": ws, "u": str(uuid.uuid4()), "e": f"{uuid.uuid4().hex[:8]}@ejemplo.test"},
            )
        await s.commit()


async def _cuantas(Sesion, ws: int) -> int:
    from sqlalchemy import text

    async with Sesion() as s:
        return int(
            (
                await s.execute(
                    text("SELECT COUNT(*) FROM workspace_members WHERE workspace_id = :w"), {"w": ws}
                )
            ).scalar()
            or 0
        )


@pytest.mark.asyncio
async def test_el_control_por_debajo_del_tope_deja_hueco(entorno):
    """EL CONTROL POSITIVO. Sin esto, un guardian que dijera «no» siempre
    pasaria todas las pruebas de abajo y dejaria el producto sin poder dar de
    alta a nadie."""
    from core.tope_de_miembros import asegurar_hueco_para_miembros

    Sesion, ws = entorno
    await _llena(Sesion, ws, 3)
    async with Sesion() as s:
        # No lanza: caben de sobra.
        await asegurar_hueco_para_miembros(s, ws, 1)
        await asegurar_hueco_para_miembros(s, ws, 10)
        await s.rollback()


@pytest.mark.asyncio
async def test_justo_en_el_tope_todavia_cabe_la_ultima(entorno):
    """El limite es inclusivo: con 49 filas, la numero 50 entra."""
    from core.tope_de_miembros import MAX_MIEMBROS_POR_WORKSPACE, asegurar_hueco_para_miembros

    Sesion, ws = entorno
    await _llena(Sesion, ws, MAX_MIEMBROS_POR_WORKSPACE - 1)
    async with Sesion() as s:
        await asegurar_hueco_para_miembros(s, ws, 1)
        await s.rollback()


@pytest.mark.asyncio
async def test_la_que_pasa_del_tope_se_rechaza(entorno):
    """LA REGLA."""
    from fastapi import HTTPException

    from core.tope_de_miembros import MAX_MIEMBROS_POR_WORKSPACE, asegurar_hueco_para_miembros

    Sesion, ws = entorno
    await _llena(Sesion, ws, MAX_MIEMBROS_POR_WORKSPACE)
    async with Sesion() as s:
        with pytest.raises(HTTPException) as e:
            await asegurar_hueco_para_miembros(s, ws, 1)
        assert e.value.status_code == 400
        assert str(MAX_MIEMBROS_POR_WORKSPACE) in str(e.value.detail)
        await s.rollback()


@pytest.mark.asyncio
async def test_el_batch_se_comprueba_entero_y_no_de_uno_en_uno(entorno):
    """Un batch que no cabe se rechaza ANTES de escribir nada.

    Comprobar de una en una dejaria pasar una peticion de treinta cuando solo
    quedan diez huecos: escribiria diez, fallaria en la once y dejaria el
    workspace con filas a medias de una peticion que el cliente cree fallida.
    """
    from fastapi import HTTPException

    from core.tope_de_miembros import MAX_MIEMBROS_POR_WORKSPACE, asegurar_hueco_para_miembros

    Sesion, ws = entorno
    await _llena(Sesion, ws, MAX_MIEMBROS_POR_WORKSPACE - 10)
    async with Sesion() as s:
        # Diez caben justo.
        await asegurar_hueco_para_miembros(s, ws, 10)
        # Once, no. Y se dice antes de escribir ninguna.
        with pytest.raises(HTTPException):
            await asegurar_hueco_para_miembros(s, ws, 11)
        await s.rollback()

    assert await _cuantas(Sesion, ws) == MAX_MIEMBROS_POR_WORKSPACE - 10, (
        "el rechazo dejo filas escritas"
    )


@pytest.mark.asyncio
async def test_el_guardian_toma_el_cerrojo_ANTES_de_contar(entorno):
    """LA PROPIEDAD QUE HACE SEGURO EL RECUENTO, medida de forma determinista.

    Contar y luego insertar es una carrera: dos peticiones leen 49, las dos
    deciden que caben, y el workspace acaba con 51. Lo que lo impide es el
    `SELECT ... FOR UPDATE` sobre la fila del workspace: la segunda peticion
    espera a que la primera confirme y vuelve a contar con su fila ya escrita.

    POR QUE ASI Y NO CON DOS PETICIONES A LA VEZ. Se escribio primero la version
    concurrente, con `asyncio.gather`. Pasaba... y seguia pasando al quitar el
    `FOR UPDATE`. Es decir, no estaba midiendo nada: el solapamiento no llegaba a
    darse y la prueba aprobaba el codigo roto.

    Una carrera que no se puede provocar a voluntad no se prueba provocandola:
    se prueba comprobando el mecanismo que la impide. `FOR UPDATE` toma
    `RowShareLock` sobre `workspaces`; un `SELECT` normal solo toma
    `AccessShareLock`. La diferencia se ve en `pg_locks` y no depende de la
    suerte del planificador.
    """
    from sqlalchemy import text

    from core.tope_de_miembros import asegurar_hueco_para_miembros

    Sesion, ws = entorno
    async with Sesion() as s:
        await asegurar_hueco_para_miembros(s, ws, 1)
        modos = {
            fila[0]
            for fila in (
                await s.execute(
                    text(
                        """
                        SELECT l.mode FROM pg_locks l
                          JOIN pg_class c ON c.oid = l.relation
                         WHERE l.pid = pg_backend_pid() AND c.relname = 'workspaces'
                        """
                    )
                )
            ).all()
        }
        await s.rollback()

    assert "RowShareLock" in modos, (
        "el guardian cuenta sin bloquear la fila del workspace: dos peticiones "
        f"concurrentes pueden saltarse el tope. Bloqueos tomados: {sorted(modos)}"
    )


@pytest.mark.asyncio
async def test_dos_peticiones_a_la_vez_no_se_saltan_el_tope(entorno):
    """LA CARRERA, contra PostgreSQL de verdad.

    Dos peticiones concurrentes con UN solo hueco libre. Sin el `FOR UPDATE`
    las dos leerian 49, las dos decidirian que cabe, y el workspace acabaria
    con 51. Con el, la segunda espera y vuelve a contar con la primera ya
    escrita.

    LO QUE ESTA PRUEBA NO GARANTIZA, y se dice: el solapamiento depende del
    planificador, asi que su verde no demuestra que el cerrojo este. Se comprobo
    con una mutacion —quitar el `FOR UPDATE`— y esta prueba seguia pasando. La
    que si lo demuestra es `test_el_guardian_toma_el_cerrojo_ANTES_de_contar`.

    Se queda porque cubre lo otro: que el camino completo —contar, escribir,
    confirmar— no se estorbe a si mismo ni deje el workspace pasado de tope
    cuando las dos peticiones si llegan a solaparse.
    """
    from fastapi import HTTPException
    from sqlalchemy import text

    from core.tope_de_miembros import MAX_MIEMBROS_POR_WORKSPACE, asegurar_hueco_para_miembros

    Sesion, ws = entorno
    await _llena(Sesion, ws, MAX_MIEMBROS_POR_WORKSPACE - 1)

    async def intenta() -> str:
        async with Sesion() as s:
            try:
                await asegurar_hueco_para_miembros(s, ws, 1)
            except HTTPException:
                await s.rollback()
                return "rechazada"
            await s.execute(
                text(
                    "INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at) "
                    "VALUES (:w, :u, :e, 'member', 'invited', NOW()::text)"
                ),
                {"w": ws, "u": str(uuid.uuid4()), "e": f"{uuid.uuid4().hex[:8]}@ejemplo.test"},
            )
            await s.commit()
            return "escrita"

    resultados = await asyncio.gather(intenta(), intenta())

    assert await _cuantas(Sesion, ws) == MAX_MIEMBROS_POR_WORKSPACE, (
        f"dos peticiones concurrentes se saltaron el tope: {resultados}"
    )
    assert sorted(resultados) == ["escrita", "rechazada"], (
        f"no entro exactamente una: {resultados}"
    )


def test_las_tres_puertas_miran_el_mismo_tope():
    """Y viene del MISMO sitio, no de tres copias del numero.

    Tres constantes con el mismo valor son una sola hasta que alguien cambia
    una. Esta prueba fija que hay una definicion y que las rutas la importan.
    """
    import inspect

    from core import tope_de_miembros
    from routers import workspace_management, workspace_members

    assert workspace_management.MAX_MIEMBROS_POR_WORKSPACE is tope_de_miembros.MAX_MIEMBROS_POR_WORKSPACE

    fuente = inspect.getsource(workspace_members)
    assert "asegurar_hueco_para_miembros" in fuente, (
        "el CRUD generico volvio a crear pertenencias sin mirar el tope"
    )
    # Las dos puertas: la simple y la de lote.
    assert fuente.count("asegurar_hueco_para_miembros(db") == 2, (
        "una de las dos rutas de creacion dejo de comprobar el tope"
    )
