"""Aislamiento de los lotes 560 y 562, intentando romperlo de verdad.

QUE NO CUENTA COMO EVIDENCIA
----------------------------
Que la consulta contenga `workspace_id`. Eso solo demuestra que alguien se
acordo de escribirlo una vez. Lo que se prueba aqui es que el inquilino A NO
PUEDE ver ni tocar la fila de B **aunque lo intente a proposito**, con una
consulta que pide explicitamente el workspace ajeno.

Se ejecuta con `nelvyon_app`, que es el rol de las peticiones HTTP. `nelvyon_jobs`
tiene BYPASSRLS y no serviria: probar con el diria que todo pasa.

LOS CUATRO VERBOS, NO SOLO LECTURA
----------------------------------
Un aislamiento que solo tapa `SELECT` deja al vecino poder BORRAR lo que no
puede ver. Se prueban los cuatro.
"""
from __future__ import annotations

import os
import secrets

import pytest

from tests._guardia_de_roles import alterar_rol

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

#: Las tablas a probar NO se listan a mano: se DESCUBREN.
#:
#: La primera version enumeraba las 20 del lote 560. Al llegar el 562 hubo que
#: ampliarla, y al llegar el 563 habria habido que ampliarla otra vez — con la
#: consecuencia obvia de que el dia que alguien olvidara ampliarla, el lote nuevo
#: quedaria sin probar y la bateria seguiria en verde.
#:
#: Se descubren por su politica: `nelvyon_apply_os_workspace_rls` crea siempre
#: una llamada `<tabla>_os_select`. Toda tabla protegida con ese patron entra
#: automaticamente, hoy y en cualquier lote futuro.
_SQL_PROTEGIDAS = """
SELECT DISTINCT p.tablename
  FROM pg_policies p
  JOIN pg_class c ON c.relname = p.tablename
 WHERE p.schemaname = 'public'
   AND p.policyname = p.tablename || '_os_select'
   AND c.relrowsecurity
 ORDER BY 1
"""

CLAVE_APP = "cert_app_rls_560"


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_app() -> str:
    base = _dsn()
    return base.split("://")[0] + "://nelvyon_app:" + CLAVE_APP + "@" + base.split("@", 1)[1]


#: Valores minimos por tipo. No pretenden ser realistas: solo tienen que ser
#: aceptables para la columna, porque lo que se prueba es el AISLAMIENTO, no el
#: contenido.
def _valor(tipo: str, nombre: str):
    t = tipo.lower()
    if "int" in t or "serial" in t or t in ("numeric", "real", "double precision"):
        return 1
    if t.startswith("bool"):
        return False
    if "timestamp" in t or t == "date":
        from datetime import datetime, timezone
        return datetime.now(timezone.utc)
    if t == "time without time zone":
        from datetime import time
        return time(10, 0)
    if t == "uuid":
        import uuid as _u
        return _u.uuid4()
    if t == "jsonb" or t == "json":
        return "{}"
    if "[]" in t or t == "array":
        return []
    return f"cert-{nombre}"[:40]


async def _sembrar(adm, tabla: str, workspace_id: int) -> None:
    """Inserta una fila minima de este workspace, rellenando lo obligatorio."""
    cols = await adm.fetch(
        """SELECT column_name, data_type, is_nullable, column_default,
                  is_generated
             FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position""", tabla)

    nombres, valores = ["workspace_id"], [workspace_id]
    for c in cols:
        n = c["column_name"]
        if n == "workspace_id" or c["is_nullable"] == "YES":
            continue
        if c["column_default"] or c["is_generated"] == "ALWAYS":
            continue          # la base sabe rellenarla
        nombres.append(n)
        valores.append(_valor(c["data_type"], n))

    marcas = ", ".join(f"${i + 1}" for i in range(len(valores)))
    columnas = ", ".join(f'"{n}"' for n in nombres)
    await adm.execute(
        f'INSERT INTO public."{tabla}" ({columnas}) VALUES ({marcas})', *valores)


@pytest.fixture
async def escenario():
    """Dos inquilinos con un dueño cada uno, y una fila de A en cada tabla."""
    asyncpg = pytest.importorskip("asyncpg")

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    ws = {}
    for n in ("A", "B"):
        correo = f"rls560-{n}-{marca}@certificacion.invalid"
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id", correo, f"RLS {n}")
        ident = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            str(uid), f"CERTIFICATION-RLS560-{n}-{marca}")
        await adm.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
            "status) VALUES ($1,$2,$3,'owner','active') "
            "ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
            ident, str(uid), correo)
        ws[n] = {"id": int(ident), "uid": str(uid), "correo": correo}

    #: En que tablas se pudo sembrar una fila de A.
    #:
    #: No basta con `INSERT (workspace_id)`: casi todas exigen otras columnas
    #: NOT NULL. Se descubren y se rellenan con un valor minimo del tipo
    #: correcto. Si no se sembrara nada, la bateria pasaria en verde sin haber
    #: comprobado un solo aislamiento — y esa es exactamente la clase de prueba
    #: que no vale para nada.
    protegidas = [r["tablename"] for r in await adm.fetch(_SQL_PROTEGIDAS)]
    assert len(protegidas) >= 20, (
        f"solo {len(protegidas)} tablas con el patron estandar: la bateria no "
        f"esta mirando lo que cree que mira")

    sembradas: list[str] = []
    for tabla in protegidas:
        try:
            await _sembrar(adm, tabla, ws["A"]["id"])
            sembradas.append(tabla)
        except Exception as exc:  # noqa: BLE001
            print(f"[siembra] {tabla}: {type(exc).__name__}: {str(exc)[:90]}")

    await alterar_rol(adm, f"ALTER ROLE nelvyon_app LOGIN PASSWORD '{CLAVE_APP}'", DSN)
    try:
        yield {"ws": ws, "adm": adm, "sembradas": sembradas,
               "protegidas": protegidas, "marca": marca}
    finally:
        for tabla in sembradas:
            try:
                await adm.execute(
                    f'DELETE FROM public."{tabla}" WHERE workspace_id = ANY($1::int[])',
                    [v["id"] for v in ws.values()])
            except Exception:  # noqa: BLE001
                pass
        ids = [v["id"] for v in ws.values()]
        await adm.execute("DELETE FROM workspace_members WHERE workspace_id = ANY($1::int[])",
                          ids)
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [v["uid"] for v in ws.values()])
        await alterar_rol(adm, "ALTER ROLE nelvyon_app NOLOGIN", DSN)
        await adm.close()


async def _como(inquilino: dict):
    """Conexion con el rol de la aplicacion y el contexto de ESE inquilino."""
    import asyncpg

    c = await asyncpg.connect(_dsn_app(), timeout=30)
    await c.execute("SELECT set_config('app.tenant_id', $1, false)",
                    str(inquilino["id"]))
    await c.execute("SELECT set_config('request.jwt.claim.sub', $1, false)",
                    inquilino["uid"])
    return c


# ═══════════════════════════════════════════════════════════════════════════
# El mecanismo quedo aplicado
# ═══════════════════════════════════════════════════════════════════════════


async def test_todas_las_tablas_del_lote_estan_protegidas(escenario):
    """Proteger casi todas y olvidar una deja el agujero donde nadie mira."""
    faltan = []
    for tabla in escenario["protegidas"]:
        r = await escenario["adm"].fetchrow(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_class "
            " WHERE relname = $1", tabla)
        if r is None:
            continue
        if not (r["relrowsecurity"] and r["relforcerowsecurity"]):
            faltan.append(tabla)
    assert not faltan, f"sin RLS forzado: {faltan}"


async def test_cada_tabla_tiene_los_cuatro_verbos(escenario):
    """Un aislamiento que solo tapa SELECT deja borrar lo que no se puede ver."""
    incompletas = {}
    for tabla in escenario["protegidas"]:
        cmds = {r["cmd"] for r in await escenario["adm"].fetch(
            "SELECT cmd FROM pg_policies WHERE schemaname='public' AND tablename=$1",
            tabla)}
        faltan = {"SELECT", "INSERT", "UPDATE", "DELETE"} - cmds
        if faltan and "ALL" not in cmds:
            incompletas[tabla] = sorted(faltan)
    assert not incompletas, f"politicas incompletas: {incompletas}"


# ═══════════════════════════════════════════════════════════════════════════
# Intentar romperlo de verdad
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_vecino_no_ve_las_filas_ajenas(escenario):
    """B pide EXPLICITAMENTE el workspace de A. Tiene que ver cero."""
    assert escenario["sembradas"], "no se pudo sembrar ninguna fila: prueba vacia"

    a, b = escenario["ws"]["A"], escenario["ws"]["B"]
    cb = await _como(b)
    try:
        for tabla in escenario["sembradas"]:
            n = await cb.fetchval(
                f'SELECT count(*) FROM public."{tabla}" WHERE workspace_id = $1',
                a["id"])
            assert n == 0, (
                f"B ve {n} filas de A en '{tabla}' pidiendolas por su "
                f"workspace_id. El aislamiento no existe.")
    finally:
        await cb.close()


async def test_el_dueno_si_ve_lo_suyo(escenario):
    """Control negativo, y el mas importante de todos.

    Sin el, una politica que ocultara TODO a TODOS pasaria la prueba anterior
    perfectamente — y dejaria a cada cliente sin ver sus propios datos, que se
    lee exactamente igual que «no hay nada».
    """
    a = escenario["ws"]["A"]
    ca = await _como(a)
    try:
        invisibles = []
        for tabla in escenario["sembradas"]:
            n = await ca.fetchval(
                f'SELECT count(*) FROM public."{tabla}" WHERE workspace_id = $1',
                a["id"])
            if n != 1:
                invisibles.append((tabla, n))
        assert not invisibles, (
            f"A no ve sus PROPIAS filas: {invisibles}. La politica filtra de mas "
            f"y el cliente se queda sin sus datos.")
    finally:
        await ca.close()


async def test_el_vecino_no_puede_borrar_lo_ajeno(escenario):
    """Lo que no se puede ver, tampoco se puede destruir."""
    a, b = escenario["ws"]["A"], escenario["ws"]["B"]
    cb = await _como(b)
    try:
        for tabla in escenario["sembradas"]:
            await cb.execute(
                f'DELETE FROM public."{tabla}" WHERE workspace_id = $1', a["id"])
    finally:
        await cb.close()

    for tabla in escenario["sembradas"]:
        n = await escenario["adm"].fetchval(
            f'SELECT count(*) FROM public."{tabla}" WHERE workspace_id = $1',
            a["id"])
        assert n == 1, f"B borro la fila de A en '{tabla}'"


async def test_el_vecino_no_puede_modificar_lo_ajeno(escenario):
    a, b = escenario["ws"]["A"], escenario["ws"]["B"]
    cb = await _como(b)
    try:
        for tabla in escenario["sembradas"]:
            await cb.execute(
                f'UPDATE public."{tabla}" SET workspace_id = $1 WHERE workspace_id = $2',
                b["id"], a["id"])
    finally:
        await cb.close()

    for tabla in escenario["sembradas"]:
        n = await escenario["adm"].fetchval(
            f'SELECT count(*) FROM public."{tabla}" WHERE workspace_id = $1',
            b["id"])
        assert n == 0, f"B se apropio de la fila de A en '{tabla}'"


async def test_el_vecino_no_puede_escribir_en_el_workspace_ajeno(escenario):
    """Insertar una fila con el `workspace_id` del vecino es la forma mas directa
    de contaminar sus datos, y `WITH CHECK` es lo unico que lo impide."""
    import asyncpg

    a, b = escenario["ws"]["A"], escenario["ws"]["B"]
    cb = await _como(b)
    bloqueadas = 0
    try:
        for tabla in escenario["sembradas"]:
            try:
                await cb.execute(
                    f'INSERT INTO public."{tabla}" (workspace_id) VALUES ($1)',
                    a["id"])
                pytest.fail(f"B inserto una fila en el workspace de A en '{tabla}'")
            except asyncpg.exceptions.InsufficientPrivilegeError:
                bloqueadas += 1
    finally:
        await cb.close()
    assert bloqueadas == len(escenario["sembradas"])


async def test_sin_contexto_de_inquilino_no_se_ve_nada(escenario):
    """Fail-closed.

    Una conexion sin contexto no es «una conexion de administrador»: es una
    conexion que no ha dicho quien es. Tiene que ver cero, no todo.
    """
    import asyncpg

    c = await asyncpg.connect(_dsn_app(), timeout=30)
    try:
        for tabla in escenario["sembradas"]:
            n = await c.fetchval(f'SELECT count(*) FROM public."{tabla}"')
            assert n == 0, (
                f"sin contexto de inquilino se ven {n} filas de '{tabla}'")
    finally:
        await c.close()
