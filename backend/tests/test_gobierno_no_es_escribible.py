"""Lo que gobierna a NELVYON no lo puede reescribir NELVYON.

EL DESCUBRIMIENTO
-----------------
Un `ALTER DEFAULT PRIVILEGES` del rol `postgres` concede escritura sobre toda
tabla nueva al rol de la aplicacion. Para las tablas de inquilino da igual —RLS
las protege— pero las tablas de plataforma no tienen RLS, asi que el GRANT era la
unica frontera y estaba abierta.

Cinco de esas tablas gobiernan el comportamiento del sistema: las politicas de
los agentes, el freno de emergencia, el catalogo de agentes, la clasificacion de
riesgo de Autopilot y el mapa de planes. Un sistema que puede reescribir sus
propias reglas no tiene reglas.
"""
from __future__ import annotations

import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

#: Las tablas de gobierno. Cada una decide algo que el sistema no puede decidir
#: sobre si mismo.
DE_GOBIERNO = [
    ("agent_policies", "lo que cada agente puede hacer"),
    ("agent_kill_switch", "el freno de emergencia"),
    ("agent_catalog", "herramientas y presupuesto de cada agente"),
    ("autopilot_capabilities", "que se ejecuta solo y que exige aprobacion"),
    ("plan_rango", "que plan da derecho a que"),
    ("_migrations", "el registro de lo aplicado"),
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def admin():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn(), timeout=30)
    try:
        yield c
    finally:
        await c.close()


@pytest.mark.parametrize("tabla,que_decide", DE_GOBIERNO)
async def test_la_aplicacion_no_puede_escribir_una_tabla_de_gobierno(
        admin, tabla, que_decide):
    """Comprobado sobre el GRANT real, no sobre la migracion."""
    concedidos = {r["privilege_type"] for r in await admin.fetch(
        "SELECT privilege_type FROM information_schema.role_table_grants "
        " WHERE table_name = $1 AND grantee = 'nelvyon_app'", tabla)}
    escritura = concedidos & {"INSERT", "UPDATE", "DELETE"}
    assert not escritura, (
        f"nelvyon_app puede {sorted(escritura)} sobre '{tabla}', que decide "
        f"{que_decide}. Esa tabla no tiene RLS, asi que el GRANT es la unica "
        f"frontera.")


@pytest.mark.parametrize("tabla,_", DE_GOBIERNO)
async def test_la_aplicacion_si_puede_leerla(admin, tabla, _):
    """Control negativo: quitar la lectura romperia la interfaz.

    Sin esto, revocar de mas pasaria la prueba anterior y romperia el producto.
    """
    concedidos = {r["privilege_type"] for r in await admin.fetch(
        "SELECT privilege_type FROM information_schema.role_table_grants "
        " WHERE table_name = $1 AND grantee = 'nelvyon_app'", tabla)}
    assert "SELECT" in concedidos, f"nelvyon_app no puede leer '{tabla}'"


async def test_el_motor_tampoco_puede_reescribir_sus_reglas(admin):
    """`nelvyon_jobs` es quien ejecuta los agentes: solo lectura, ya desde la 556."""
    for tabla in ("agent_policies", "agent_kill_switch", "agent_catalog"):
        concedidos = {r["privilege_type"] for r in await admin.fetch(
            "SELECT privilege_type FROM information_schema.role_table_grants "
            " WHERE table_name = $1 AND grantee = 'nelvyon_jobs'", tabla)}
        assert not (concedidos & {"INSERT", "UPDATE", "DELETE"}), (
            f"nelvyon_jobs puede escribir '{tabla}'")
        assert "SELECT" in concedidos


async def test_el_intento_de_escritura_se_rechaza_de_verdad(admin):
    """Ejecutando, no leyendo el catalogo de privilegios."""
    import asyncpg

    await admin.execute("ALTER ROLE nelvyon_app LOGIN PASSWORD 'cert_app_tmp'")
    try:
        base = _dsn()
        c = await asyncpg.connect(
            base.split("://")[0] + "://nelvyon_app:cert_app_tmp@" + base.split("@", 1)[1])
        try:
            for sql in (
                "UPDATE agent_kill_switch SET detenido = false WHERE ambito='global'",
                "UPDATE agent_policies SET modo = 'AUTOMATIC_SAFE' WHERE id IS NOT NULL",
                "UPDATE autopilot_capabilities SET modo_ejecucion = 'AUTOMATIC_SAFE' "
                " WHERE clave IS NOT NULL",
                "DELETE FROM _migrations WHERE name IS NOT NULL",
            ):
                with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                    await c.execute(sql)
        finally:
            await c.close()
    finally:
        await admin.execute("ALTER ROLE nelvyon_app NOLOGIN")
