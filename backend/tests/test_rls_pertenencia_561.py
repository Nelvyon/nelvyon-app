"""Las dos tablas fundacionales: aisladas, y sin romper el selector.

EL RIESGO QUE ESTA BATERIA VIGILA
---------------------------------
`workspaces` y `workspace_members` no se pueden proteger con la politica
estandar. Esa exige `workspace_id = workspace_actual`, y estas dos se consultan
ANTES de que haya ninguno elegido: `GET /workspaces/list` pregunta «¿cuales son
los workspaces de este usuario?».

Con la politica estandar esa ruta devolveria como mucho uno, y sin contexto
devolveria cero. El selector se quedaria vacio y el usuario leeria «no tienes
ningun workspace»: un fallo silencioso, sin error.

Por eso la mitad de estas pruebas comprueban que el usuario SIGUE VIENDO LO
SUYO. Un aislamiento que oculta a cada uno sus propios datos no es aislamiento,
es una averia.
"""
from __future__ import annotations

import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

CLAVE_APP = "cert_app_rls_561"


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_app() -> str:
    base = _dsn()
    return (base.split("://")[0] + "://nelvyon_app:" + CLAVE_APP + "@"
            + base.split("@", 1)[1])


@pytest.fixture
async def escenario():
    """Ana tiene dos workspaces propios y es miembro de uno de Bruno.

    Bruno tiene uno propio donde Ana NO entra. Esa asimetria es lo que permite
    distinguir «ve lo suyo» de «lo ve todo».
    """
    asyncpg = pytest.importorskip("asyncpg")

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)

    async def _usuario(nombre: str):
        correo = f"{nombre}-{marca}@certificacion.invalid"
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id", correo, nombre)
        return {"uid": str(uid), "correo": correo}

    async def _workspace(dueno, etiqueta: str):
        ws = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            dueno["uid"], f"CERTIFICATION-561-{etiqueta}-{marca}")
        await adm.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
            "status) VALUES ($1,$2,$3,'owner','active') "
            "ON CONFLICT (workspace_id, user_id) "
            "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
            ws, dueno["uid"], dueno["correo"])
        return int(ws)

    ana = await _usuario("ana")
    bruno = await _usuario("bruno")

    ana_1 = await _workspace(ana, "ana1")
    ana_2 = await _workspace(ana, "ana2")
    bruno_compartido = await _workspace(bruno, "compartido")
    bruno_privado = await _workspace(bruno, "privado")

    # Ana es miembro (no dueña) del compartido de Bruno.
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'viewer','active') ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        bruno_compartido, ana["uid"], ana["correo"])

    await adm.execute(f"ALTER ROLE nelvyon_app LOGIN PASSWORD '{CLAVE_APP}'")
    ids = [ana_1, ana_2, bruno_compartido, bruno_privado]
    try:
        yield {"adm": adm, "ana": ana, "bruno": bruno, "ana_1": ana_1,
               "ana_2": ana_2, "compartido": bruno_compartido,
               "privado": bruno_privado, "ids": ids, "marca": marca}
    finally:
        await adm.execute("DELETE FROM workspace_members WHERE workspace_id = ANY($1::int[])",
                          ids)
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM workspaces WHERE name LIKE $1",
                          f"CERTIFICATION-561-%{marca}")
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [ana["uid"], bruno["uid"]])
        await adm.execute("ALTER ROLE nelvyon_app NOLOGIN")
        await adm.close()


async def _como(usuario: dict, workspace: int | None = None):
    """Rol de la aplicacion, con o SIN workspace seleccionado.

    Sin workspace es el caso importante: es como llega la peticion que alimenta
    el selector, justo despues del login.
    """
    import asyncpg

    c = await asyncpg.connect(_dsn_app(), timeout=30)
    await c.execute("SELECT set_config('request.jwt.claim.sub', $1, false)",
                    usuario["uid"])
    if workspace is not None:
        await c.execute("SELECT set_config('app.tenant_id', $1, false)",
                        str(workspace))
    return c


# ═══════════════════════════════════════════════════════════════════════════
# Lo que NO se puede romper: el usuario sigue viendo lo suyo
# ═══════════════════════════════════════════════════════════════════════════


async def test_sin_workspace_seleccionado_ana_ve_sus_tres(escenario):
    """LA PRUEBA QUE PROTEGE EL SELECTOR.

    Es la consulta que hace `GET /workspaces/list` justo despues del login,
    cuando todavia no hay ningun workspace elegido. Ana tiene dos propios y es
    miembro de uno de Bruno: tiene que ver los tres.

    Con la politica estandar de OS esto habria devuelto CERO.
    """
    c = await _como(escenario["ana"])
    try:
        vistos = {r["id"] for r in await c.fetch(
            "SELECT id FROM workspaces WHERE name LIKE $1",
            f"CERTIFICATION-561-%{escenario['marca']}")}
    finally:
        await c.close()

    esperados = {escenario["ana_1"], escenario["ana_2"], escenario["compartido"]}
    assert vistos == esperados, (
        f"Ana ve {sorted(vistos)} y deberia ver {sorted(esperados)}. Si ve menos, "
        f"el selector de workspaces se queda vacio y parece que no tiene ninguno.")


async def test_ana_ve_sus_pertenencias_sin_contexto(escenario):
    """El selector necesita las pertenencias, no solo los workspaces."""
    c = await _como(escenario["ana"])
    try:
        filas = await c.fetch(
            "SELECT workspace_id FROM workspace_members WHERE user_id = $1",
            escenario["ana"]["uid"])
    finally:
        await c.close()

    vistos = {r["workspace_id"] for r in filas}
    assert escenario["compartido"] in vistos, (
        "Ana no ve su pertenencia al workspace compartido: el selector no sabria "
        "que existe")
    assert escenario["ana_1"] in vistos


async def test_con_un_workspace_seleccionado_sigue_viendo_los_demas(escenario):
    """Elegir uno no puede ocultar los otros: el selector sigue en pantalla."""
    c = await _como(escenario["ana"], workspace=escenario["ana_1"])
    try:
        vistos = {r["id"] for r in await c.fetch(
            "SELECT id FROM workspaces WHERE name LIKE $1",
            f"CERTIFICATION-561-%{escenario['marca']}")}
    finally:
        await c.close()
    assert len(vistos) == 3, f"con uno seleccionado ve {sorted(vistos)}"


# ═══════════════════════════════════════════════════════════════════════════
# Lo que SI tiene que estar cerrado
# ═══════════════════════════════════════════════════════════════════════════


async def test_ana_no_ve_el_workspace_privado_de_bruno(escenario):
    c = await _como(escenario["ana"])
    try:
        n = await c.fetchval("SELECT count(*) FROM workspaces WHERE id = $1",
                             escenario["privado"])
    finally:
        await c.close()
    assert n == 0, "Ana ve un workspace de Bruno al que no pertenece"


async def test_ana_no_ve_las_pertenencias_del_workspace_privado(escenario):
    """Ver quien mas trabaja en una empresa ajena ya es una fuga."""
    c = await _como(escenario["ana"])
    try:
        n = await c.fetchval(
            "SELECT count(*) FROM workspace_members WHERE workspace_id = $1",
            escenario["privado"])
    finally:
        await c.close()
    assert n == 0


async def test_ana_no_puede_colarse_en_el_workspace_de_bruno(escenario):
    """El ataque mas directo: insertarse como miembro de un workspace ajeno."""
    import asyncpg

    c = await _como(escenario["ana"])
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await c.execute(
                "INSERT INTO workspace_members (workspace_id, user_id, email, "
                "role, status) VALUES ($1,$2,$3,'owner','active')",
                escenario["privado"], escenario["ana"]["uid"],
                escenario["ana"]["correo"])
    finally:
        await c.close()


async def test_como_simple_miembro_ana_no_puede_invitar(escenario):
    """Ana es `viewer` en el compartido: ve, pero no reparte accesos."""
    import asyncpg

    c = await _como(escenario["ana"], workspace=escenario["compartido"])
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await c.execute(
                "INSERT INTO workspace_members (workspace_id, user_id, email, "
                "role, status) VALUES ($1,'99999','colado@x.invalid','admin','active')",
                escenario["compartido"])
    finally:
        await c.close()


async def test_ana_no_puede_renombrar_el_workspace_de_bruno(escenario):
    c = await _como(escenario["ana"])
    try:
        await c.execute("UPDATE workspaces SET name = 'secuestrado' WHERE id = $1",
                        escenario["privado"])
    finally:
        await c.close()
    nombre = await escenario["adm"].fetchval(
        "SELECT name FROM workspaces WHERE id = $1", escenario["privado"])
    assert nombre != "secuestrado"


async def test_ana_no_puede_borrar_el_workspace_de_bruno(escenario):
    c = await _como(escenario["ana"])
    try:
        await c.execute("DELETE FROM workspaces WHERE id = $1", escenario["privado"])
    finally:
        await c.close()
    n = await escenario["adm"].fetchval(
        "SELECT count(*) FROM workspaces WHERE id = $1", escenario["privado"])
    assert n == 1, "Ana borro un workspace de Bruno"


async def test_nadie_puede_crear_un_workspace_a_nombre_de_otro(escenario):
    """`WITH CHECK` sobre el INSERT: te lo pones a tu nombre o no lo creas."""
    import asyncpg

    c = await _como(escenario["ana"])
    try:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await c.execute(
                "INSERT INTO workspaces (user_id, name, status, plan) "
                "VALUES ($1,$2,'active','starter')",
                escenario["bruno"]["uid"],
                f"CERTIFICATION-561-suplantado-{escenario['marca']}")
    finally:
        await c.close()


async def test_ana_no_puede_transferirse_el_workspace_de_bruno(escenario):
    """El `WITH CHECK` del UPDATE cierra la via indirecta: cambiar el dueño."""
    c = await _como(escenario["ana"], workspace=escenario["compartido"])
    try:
        await c.execute("UPDATE workspaces SET user_id = $1 WHERE id = $2",
                        escenario["ana"]["uid"], escenario["compartido"])
    finally:
        await c.close()
    dueno = await escenario["adm"].fetchval(
        "SELECT user_id FROM workspaces WHERE id = $1", escenario["compartido"])
    assert dueno == escenario["bruno"]["uid"], "Ana se apropio del workspace"


# ═══════════════════════════════════════════════════════════════════════════
# El alta sigue funcionando: sin esto nadie podria empezar
# ═══════════════════════════════════════════════════════════════════════════


async def test_crear_un_workspace_y_darse_de_alta_como_dueno_funciona(escenario):
    """El problema del huevo y la gallina.

    Al crear un workspace no hay ninguna pertenencia todavia, asi que la politica
    de `workspace_members` no puede depender SOLO de ser miembro. Funciona porque
    las funciones comprueban antes si eres el dueño del workspace.
    """
    c = await _como(escenario["bruno"])
    try:
        nuevo = await c.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            escenario["bruno"]["uid"],
            f"CERTIFICATION-561-nuevo-{escenario['marca']}")
        assert nuevo, "no se pudo crear el workspace"

        await c.execute(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
            "status) VALUES ($1,$2,$3,'owner','active')",
            nuevo, escenario["bruno"]["uid"], escenario["bruno"]["correo"])

        assert await c.fetchval(
            "SELECT count(*) FROM workspace_members WHERE workspace_id = $1",
            nuevo) == 1
    finally:
        await c.close()

    escenario["ids"].append(int(nuevo))


async def test_sin_usuario_identificado_no_se_ve_nada(escenario):
    """Fail-closed: una conexion que no dice quien es no ve nada."""
    import asyncpg

    c = await asyncpg.connect(_dsn_app(), timeout=30)
    try:
        n = await c.fetchval("SELECT count(*) FROM workspaces WHERE name LIKE $1",
                             f"CERTIFICATION-561-%{escenario['marca']}")
        m = await c.fetchval("SELECT count(*) FROM workspace_members "
                             " WHERE workspace_id = ANY($1::int[])",
                             escenario["ids"])
    finally:
        await c.close()
    assert n == 0 and m == 0, (
        f"sin usuario identificado se ven {n} workspaces y {m} pertenencias")


# ═══════════════════════════════════════════════════════════════════════════
# `INSERT ... RETURNING` bajo RLS: la trampa que casi rompe el alta
# ═══════════════════════════════════════════════════════════════════════════


async def test_insert_returning_funciona_en_las_tablas_fundacionales(escenario):
    """EL HALLAZGO QUE MAS CERCA ESTUVO DE ROMPER PRODUCCION.

    Una fila devuelta por `RETURNING` tiene que pasar tambien la politica de
    SELECT. La primera version de la 561 usaba solo `nelvyon_user_in_workspace`,
    que es SECURITY DEFINER: hace su propia consulta, con su propio snapshot,
    donde la fila recien insertada TODAVIA NO EXISTE. El INSERT sin RETURNING
    funcionaba y el INSERT con RETURNING fallaba.

    SQLAlchemy emite `INSERT ... RETURNING id` en cada `flush()`, asi que crear
    un workspace habria dejado de funcionar — con un error de permisos que no
    menciona el RETURNING por ninguna parte.

    La leccion vale para CUALQUIER tabla que se proteja despues: si la politica
    de SELECT depende de una subconsulta, el RETURNING se rompe.
    """
    c = await _como(escenario["bruno"])
    try:
        nuevo = await c.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            escenario["bruno"]["uid"],
            f"CERTIFICATION-561-returning-{escenario['marca']}")
        assert nuevo is not None, (
            "`INSERT ... RETURNING` no devolvio la fila: la politica de SELECT "
            "depende de algo que no ve la fila recien insertada")

        pertenencia = await c.fetchval(
            "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
            "status) VALUES ($1,$2,$3,'owner','active') RETURNING id",
            nuevo, escenario["bruno"]["uid"], escenario["bruno"]["correo"])
        assert pertenencia is not None, (
            "`INSERT ... RETURNING` fallo en workspace_members")
    finally:
        await c.close()
    escenario["ids"].append(int(nuevo))


async def test_ninguna_politica_de_select_de_estas_dos_depende_solo_de_una_funcion(
        escenario):
    """Guard estructural del hallazgo anterior.

    Si alguien simplifica la politica dejando solo la llamada a la funcion, el
    `RETURNING` se rompe otra vez. Se exige que la comparacion directa siga ahi.
    """
    for tabla, columna in (("workspaces", "user_id"),
                           ("workspace_members", "user_id")):
        qual = await escenario["adm"].fetchval(
            "SELECT qual::text FROM pg_policies "
            " WHERE tablename = $1 AND cmd = 'SELECT'", tabla)
        assert qual, f"{tabla} sin politica de SELECT"
        assert columna in qual, (
            f"la politica de SELECT de '{tabla}' ya no compara `{columna}` "
            f"directamente: `INSERT ... RETURNING` volvera a fallar. Ver "
            f"`test_insert_returning_funciona_en_las_tablas_fundacionales`.")
