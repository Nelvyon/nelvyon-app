"""RLS de extremo a extremo: petición → contexto → transacción → política.

QUE SE CERTIFICA
----------------
Que el contexto de inquilino llega a PostgreSQL en TODAS las transacciones de
una petición —no solo en la primera— y que, con un rol sin `BYPASSRLS`, las
políticas aíslan de verdad y fallan cerrado cuando el contexto falta.

Es la pieza que faltaba para poder retirar el privilegio con evidencia. El paso
que NO se da aquí es cambiar el rol de producción: eso necesita su propia
ventana, porque un fallo se manifiesta como filas que desaparecen y no como un
error.

LA IDENTIDAD CANONICA, DECIDIDA
-------------------------------
Había tres candidatas y no pueden convivir contradiciéndose. La decisión, tomada
contando políticas sobre el esquema real:

    request.jwt.claim.sub   identidad de USUARIO   → 617 políticas
    app.tenant_id           identidad de INQUILINO →  53 políticas
    auth.uid()              no es una tercera: es un alias que `nelvyon_jwt_user_id()`
                            resuelve leyendo `request.jwt.claim.sub`

Son dos ejes complementarios, no tres identidades rivales: quién eres y en qué
inquilino trabajas. Por eso se fijan las dos juntas y siempre juntas; fijar una
sola es lo que dejaba 617 políticas evaluando NULL.

LOS CASOS QUE IMPORTAN
----------------------
Los de fuga (A no ve ni toca lo de B) y los de contexto (sin contexto, con
contexto falso, tras un commit, y con una conexión reutilizada del pool). Este
último es el que convierte un mecanismo de aislamiento en su contrario si se
implementa mal.
"""
from __future__ import annotations

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

ROL = "nelvyon_rls_flujo"
CLAVE = "flujo-cert"


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_rol() -> str:
    return f"postgresql://{ROL}:{CLAVE}@{_dsn().split('@', 1)[1]}"


@pytest.fixture
async def escenario():
    """Dos usuarios reales con un ticket cada uno, y un rol sin BYPASSRLS."""
    asyncpg = pytest.importorskip("asyncpg")
    admin = await asyncpg.connect(_dsn())
    a, b = str(_uuid.uuid4()), str(_uuid.uuid4())

    async def limpiar():
        await admin.execute("DELETE FROM support_tickets WHERE subject LIKE 'flujo-cert%'")
        await admin.execute("DELETE FROM nelvyon_users WHERE email LIKE 'flujo-cert-%@nelvyon.test'")

    if await admin.fetchval("SELECT count(*) FROM pg_roles WHERE rolname=$1", ROL):
        await admin.execute(f"DROP OWNED BY {ROL}")
        await admin.execute(f"DROP ROLE {ROL}")
    await admin.execute(f"CREATE ROLE {ROL} LOGIN PASSWORD '{CLAVE}' NOSUPERUSER NOBYPASSRLS")
    await admin.execute(f"GRANT USAGE ON SCHEMA public, auth TO {ROL}")
    await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO {ROL}")

    await limpiar()
    for usuario, asunto in ((a, "flujo-cert A"), (b, "flujo-cert B")):
        await admin.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, tenant_id) "
            "VALUES ($1::uuid, $2, 'x', 'Cert RLS', 'free', gen_random_uuid())",
            usuario, f"flujo-cert-{usuario[:8]}@nelvyon.test",
        )
        await admin.execute(
            "INSERT INTO support_tickets (user_id, subject, body, category, status) "
            "VALUES ($1::uuid, $2, 'certificacion de flujo', 'other', 'open')",
            usuario, asunto,
        )
    try:
        yield admin, a, b
    finally:
        await limpiar()
        await admin.execute(f"DROP OWNED BY {ROL}")
        await admin.execute(f"DROP ROLE IF EXISTS {ROL}")
        await admin.close()


async def _asuntos(conexion) -> set[str]:
    filas = await conexion.fetch("SELECT subject FROM support_tickets WHERE subject LIKE 'flujo-cert%'")
    return {f["subject"] for f in filas}


# ── aislamiento con el rol restringido ──────────────────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_cada_uno_ve_lo_suyo_y_solo_lo_suyo(escenario):
    """Control positivo y negativo en la misma prueba.

    El positivo importa tanto como el negativo: sin él, unas políticas que
    denegaran TODO pasarían el test de fuga y parecerían correctas.
    """
    asyncpg = pytest.importorskip("asyncpg")
    _, a, b = escenario
    conn = await asyncpg.connect(_dsn_rol())
    try:
        for usuario, propio, ajeno in ((a, "flujo-cert A", "flujo-cert B"),
                                       (b, "flujo-cert B", "flujo-cert A")):
            async with conn.transaction():
                await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", usuario)
                vistos = await _asuntos(conn)
            assert propio in vistos, f"{propio} no ve lo suyo: el contexto no llega"
            assert ajeno not in vistos, f"FUGA: se ve {ajeno}"
    finally:
        await conn.close()


@requiere_pg
@pytest.mark.asyncio
async def test_no_se_puede_modificar_lo_ajeno(escenario):
    """Leer no es lo único que hay que impedir."""
    asyncpg = pytest.importorskip("asyncpg")
    admin, a, b = escenario
    conn = await asyncpg.connect(_dsn_rol())
    try:
        async with conn.transaction():
            await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", a)
            await conn.execute(
                "UPDATE support_tickets SET status = 'closed' WHERE subject = 'flujo-cert B'"
            )
            await conn.execute("DELETE FROM support_tickets WHERE subject = 'flujo-cert B'")
    finally:
        await conn.close()

    fila = await admin.fetchrow("SELECT status FROM support_tickets WHERE subject = 'flujo-cert B'")
    assert fila is not None, "A borró el ticket de B"
    assert fila["status"] == "open", "A modificó el ticket de B"


@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_ve_nada(escenario):
    """Fail-closed. Es la propiedad que hace que un descuido no sea una fuga."""
    asyncpg = pytest.importorskip("asyncpg")
    conn = await asyncpg.connect(_dsn_rol())
    try:
        assert await _asuntos(conn) == set()
    finally:
        await conn.close()


@requiere_pg
@pytest.mark.asyncio
async def test_un_contexto_inventado_no_abre_nada(escenario):
    """Manipular el contexto con una identidad que no es la propia no concede
    acceso: la política compara contra la fila, no contra lo que diga el cliente.
    """
    asyncpg = pytest.importorskip("asyncpg")
    conn = await asyncpg.connect(_dsn_rol())
    try:
        async with conn.transaction():
            await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", str(_uuid.uuid4()))
            assert await _asuntos(conn) == set()
    finally:
        await conn.close()


# ── el contexto y el ciclo de vida de la transaccion ────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_el_contexto_no_sobrevive_al_commit(escenario):
    """Si sobreviviera, la siguiente petición heredaría el inquilino anterior.

    Este es el caso que convierte el mecanismo de aislamiento en una fuga, y por
    eso se fija con ámbito de transacción y no de conexión.
    """
    asyncpg = pytest.importorskip("asyncpg")
    _, a, _b = escenario
    conn = await asyncpg.connect(_dsn_rol())
    try:
        async with conn.transaction():
            await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", a)
            assert "flujo-cert A" in await _asuntos(conn)
        # fuera de la transacción, el contexto ya no está
        assert await _asuntos(conn) == set(), "el contexto sobrevivió al commit"
    finally:
        await conn.close()


@requiere_pg
@pytest.mark.asyncio
async def test_una_conexion_reutilizada_no_conserva_la_identidad(escenario):
    """Simula el pool: la misma conexión sirve a dos usuarios seguidos."""
    asyncpg = pytest.importorskip("asyncpg")
    _, a, b = escenario
    conn = await asyncpg.connect(_dsn_rol())
    try:
        async with conn.transaction():
            await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", a)
            assert await _asuntos(conn) == {"flujo-cert A"}
        async with conn.transaction():
            await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", b)
            vistos = await _asuntos(conn)
        assert vistos == {"flujo-cert B"}, f"la identidad anterior se filtró: {vistos}"
    finally:
        await conn.close()


@requiere_pg
@pytest.mark.asyncio
async def test_un_rollback_no_filtra_el_contexto(escenario):
    """Una transacción abortada tampoco puede dejar rastro."""
    asyncpg = pytest.importorskip("asyncpg")
    _, a, _b = escenario
    conn = await asyncpg.connect(_dsn_rol())
    try:
        with pytest.raises(Exception):
            async with conn.transaction():
                await conn.execute("SELECT set_config('request.jwt.claim.sub', $1, true)", a)
                await conn.execute("SELECT 1/0")
        assert await _asuntos(conn) == set(), "el contexto sobrevivió a un rollback"
    finally:
        await conn.close()


# ── el enganche de la aplicacion ────────────────────────────────────────────

def test_las_sentencias_de_contexto_fijan_las_dos_variables():
    """Las 617 políticas de usuario y las 53 de inquilino necesitan las dos.

    Fijar solo `app.tenant_id` —lo que hacía la aplicación— dejaba a las
    primeras evaluando NULL, y con RLS activo eso deniega todo en silencio.
    """
    from core.contexto_rls import sentencias_de_contexto

    sentencias = sentencias_de_contexto(42, "u-1")
    sql = " ".join(s for s, _ in sentencias)
    assert "app.tenant_id" in sql
    assert "request.jwt.claim.sub" in sql
    assert sql.count("true)") == 2, "ambas deben tener ámbito de transacción"


def test_sin_datos_de_contexto_no_se_ejecuta_nada():
    """Una petición sin inquilino ni usuario no debe emitir SQL inútil."""
    from core.contexto_rls import sentencias_de_contexto

    assert sentencias_de_contexto(None, None) == []


def test_el_contexto_se_engancha_al_empezar_cada_transaccion():
    """Sobre el código: el enganche es `after_begin`, no «al crear la sesión».

    La diferencia importa. Con `after_begin`, un handler que hace commit y
    vuelve a consultar recibe el contexto en la segunda transacción; sin él, esa
    segunda consulta iría sin contexto y devolvería cero filas sin error.
    """
    from pathlib import Path

    fuente = (Path(__file__).resolve().parent.parent / "core" / "contexto_rls.py").read_text(
        encoding="utf-8"
    )
    assert '"after_begin"' in fuente


# ── por que RLS sigue sin activarse, medido ─────────────────────────────────

@requiere_pg
@pytest.mark.asyncio
async def test_cuantas_tablas_quedarian_inaccesibles_si_se_activara_rls(escenario):
    """La razón de que el privilegio NO se retire todavía, en números.

    No es una opinión ni una precaución vaga: hay tablas con RLS que carecen de
    la política correspondiente a la operación, y sobre esas el rol restringido
    no denegaría «de más» — denegaría TODO, y en silencio, porque una política
    ausente devuelve cero filas en vez de un error.

    Este test no exige que el número sea cero: documenta el estado real y falla
    si CRECE, para que nadie añada una tabla con RLS sin su política. Cuando
    llegue a cero, junto con un mecanismo explícito para jobs y migraciones
    —que corren sin contexto de petición y hoy serían denegados en las 317—,
    retirar BYPASSRLS pasará a ser una decisión con evidencia.
    """
    admin, _a, _b = escenario
    huecos = {
        "sin_insert": await admin.fetchval(
            "SELECT count(*) FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity "
            "AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' "
            "AND p.tablename=t.tablename AND p.cmd IN ('INSERT','ALL'))"
        ),
        "sin_select": await admin.fetchval(
            "SELECT count(*) FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity "
            "AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' "
            "AND p.tablename=t.tablename AND p.cmd IN ('SELECT','ALL'))"
        ),
        "sin_ninguna": await admin.fetchval(
            "SELECT count(*) FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity "
            "AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' "
            "AND p.tablename=t.tablename)"
        ),
    }
    MEDIDO = {"sin_insert": 28, "sin_select": 13, "sin_ninguna": 10}
    for clave, tope in MEDIDO.items():
        assert huecos[clave] <= tope, (
            f"{clave}: {huecos[clave]} tablas, medido {tope}. Ha crecido: se añadió "
            "una tabla con RLS sin su política, y bajo un rol sin BYPASSRLS eso "
            "deniega en silencio."
        )
