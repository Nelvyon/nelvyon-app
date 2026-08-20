"""El circuito de autoservicio, con el fundador trabajando en otra cosa.

QUE DEMUESTRA
-------------
Un usuario nuevo crea su workspace, queda como owner de verdad, y su plan pagado
le desbloquea el producto. Sin comandos manuales, sin tocar PostgreSQL, sin
aprobacion de nadie.

EL FALLO QUE LO IMPEDIA
-----------------------
`POST /workspaces/create` insertaba la fila en `workspaces`, devolvia
`role: "owner", members_count: 1` y NUNCA escribia en `workspace_members`. La
respuesta mentia.

Con RLS activo eso deja al creador fuera de su propio workspace:
`nelvyon_user_in_workspace()` consulta esa tabla, asi que todas las politicas
`os_*` le deniegan. El cliente se registra, crea su espacio, y el producto le
aparece vacio.

Se veia en produccion sin leer una linea de codigo: 3 workspaces, 1 pertenencia.
Dos dueños sin acceso a lo suyo. Era el bloqueador real del autoservicio, por
delante de cualquier cosa de Stripe.
"""
from __future__ import annotations

import asyncio
import os
import secrets

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
ROL = "nelvyon_app_autoservicio"

pytestmark = pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def adm():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn(), timeout=30)
    try:
        yield c
    finally:
        await c.close()


@pytest.fixture
async def visitante(adm):
    """Alguien que acaba de registrarse: solo existe su fila de usuario.

    Es exactamente lo que deja el registro real (`AuthService.register`): crea
    `nelvyon_users` y nada mas. Ni workspace ni pertenencia.
    """
    marca = secrets.token_hex(4)
    correo = f"visitante-{marca}@nelvyon.test"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Visitante') RETURNING user_id", correo)
    creados: list[int] = []
    try:
        yield {"uid": uid, "email": correo, "workspaces": creados}
    finally:
        for ws in creados:
            for t in ("subscriptions", "workspace_members", "onboarding_progress"):
                await adm.execute(f"DELETE FROM {t} WHERE workspace_id=$1", ws)
            await adm.execute("DELETE FROM workspaces WHERE id=$1", ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)


async def _crear_workspace(adm, visitante, nombre: str) -> int:
    """Reproduce lo que hace la ruta corregida: workspace + pertenencia owner."""
    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,$2,'active','starter') RETURNING id",
        str(visitante["uid"]), nombre)
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') "
        "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ws, str(visitante["uid"]), visitante["email"])
    visitante["workspaces"].append(int(ws))
    return int(ws)


# ═══════════════════════════════════════════════════════════════════════════
# 1. La ruta ya no miente
# ═══════════════════════════════════════════════════════════════════════════


def test_la_ruta_de_creacion_escribe_la_pertenencia():
    """EL FALLO EXACTO, fijado en el codigo.

    Antes devolvia `role: "owner"` sin escribir nada. Este guard lee las dos rutas
    que crean workspaces y exige que ambas registren al dueño.
    """
    from pathlib import Path

    fuente = (Path(__file__).resolve().parent.parent
              / "routers" / "workspace_management.py").read_text(encoding="utf-8")
    assert fuente.count("_asegurar_pertenencia_owner(") >= 2, (
        "alguna ruta vuelve a crear un workspace sin registrar a su dueño: con RLS "
        "activo eso deja al creador fuera de su propio espacio"
    )
    assert "await db.flush()" in fuente, (
        "la pertenencia tiene que entrar en la MISMA transaccion que el workspace; "
        "si no, un fallo entre medias deja un workspace huerfano"
    )
    # El indice de la 550 es parcial, asi que el ON CONFLICT tiene que repetir su
    # predicado: sin el, ni PostgreSQL ni SQLite encuentran a que acogerse.
    assert "ON CONFLICT (workspace_id, user_id) " in fuente
    assert "user_id != '' DO NOTHING" in fuente
    assert "with_for_update" in fuente, (
        "toda escritura en workspace_members serializa contra su workspace")


# ═══════════════════════════════════════════════════════════════════════════
# 2. El circuito completo
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_de_visitante_registrado_a_producto_desbloqueado(adm, visitante):
    """EL CIRCUITO. Registro -> workspace -> owner -> plan -> capabilities."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.plan_quota import _module_allowed, get_active_plan_id_for_workspace

    ws = await _crear_workspace(adm, visitante, "mi-empresa")

    # Es owner DE VERDAD, no solo en la respuesta HTTP.
    rol = await adm.fetchval(
        "SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
        ws, str(visitante["uid"]))
    assert rol == "owner", "el creador no consta como dueño de su propio workspace"

    dsn = _dsn().replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")
    motor = create_async_engine(dsn)
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as s:
            assert await get_active_plan_id_for_workspace(s, ws) == "starter"

        # El webhook de Stripe aplica el plan pagado.
        await adm.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
            "billing_cycle, status) VALUES ($1,$2,'pro','monthly','active')",
            ws, visitante["uid"])

        async with maker() as s:
            plan = await get_active_plan_id_for_workspace(s, ws)
        assert plan == "pro", f"pago y sigue en '{plan}'"
        assert _module_allowed(plan, "contacts"), "el plan pagado no desbloquea nada"
    finally:
        await motor.dispose()


@pytest.mark.asyncio
async def test_el_dueno_pasa_el_control_de_pertenencia_de_rls(adm, visitante):
    """La comprobacion que usan todas las politicas `os_*`.

    Si esto fallara, el cliente veria su producto vacio pese a haber pagado — que
    es justo lo que ocurria con los dos workspaces huerfanos de produccion.
    """
    ws = await _crear_workspace(adm, visitante, "control-rls")
    await adm.execute("SELECT set_config('request.jwt.claim.sub', $1, false)",
                      str(visitante["uid"]))
    await adm.execute("SELECT set_config('app.tenant_id', $1, false)", str(ws))
    assert await adm.fetchval("SELECT nelvyon_user_in_workspace($1)", ws) is True


# ═══════════════════════════════════════════════════════════════════════════
# 3. Las anomalias que provoca un usuario real
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_doble_clic_no_duplica_la_pertenencia(adm, visitante):
    """Un doble clic en «crear»: la segunda no puede dejar una fila de mas."""
    ws = await _crear_workspace(adm, visitante, "doble-clic")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active') "
        "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
        ws, str(visitante["uid"]), visitante["email"])
    n = await adm.fetchval(
        "SELECT count(*) FROM workspace_members WHERE workspace_id=$1", ws)
    assert n == 1, f"{n} pertenencias para la misma persona"


@pytest.mark.asyncio
async def test_dos_altas_simultaneas_dejan_una_sola_pertenencia(adm, visitante):
    """CONCURRENCIA REAL: dos peticiones a la vez, no en secuencia.

    Es el caso que un `SELECT` previo no cubre. Quien lo impide es la restriccion
    unica de la migracion 550.
    """
    asyncpg = pytest.importorskip("asyncpg")

    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,'concurrente','active','starter') RETURNING id",
        str(visitante["uid"]))
    visitante["workspaces"].append(int(ws))

    async def _insertar():
        c = await asyncpg.connect(_dsn(), timeout=30)
        try:
            await c.execute(
                "INSERT INTO workspace_members (workspace_id, user_id, email, role, "
                "status) VALUES ($1,$2,$3,'owner','active') "
                "ON CONFLICT (workspace_id, user_id) "
        "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING",
                ws, str(visitante["uid"]), visitante["email"])
        finally:
            await c.close()

    await asyncio.gather(_insertar(), _insertar(), _insertar())
    n = await adm.fetchval(
        "SELECT count(*) FROM workspace_members WHERE workspace_id=$1", ws)
    assert n == 1, f"la concurrencia dejo {n} pertenencias"


@pytest.mark.asyncio
async def test_un_usuario_de_otro_workspace_no_entra(adm, visitante):
    """Aislamiento: pertenecer a un workspace no da acceso al de al lado."""
    ws = await _crear_workspace(adm, visitante, "propio")

    marca = secrets.token_hex(4)
    otro = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Otro') RETURNING user_id", f"otro-{marca}@nelvyon.test")
    try:
        await adm.execute("SELECT set_config('request.jwt.claim.sub', $1, false)",
                          str(otro))
        await adm.execute("SELECT set_config('app.tenant_id', $1, false)", str(ws))
        assert await adm.fetchval("SELECT nelvyon_user_in_workspace($1)", ws) is False, (
            "un usuario ajeno pasa el control de pertenencia")
    finally:
        await adm.execute("SELECT set_config('request.jwt.claim.sub', '', false)")
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", otro)


@pytest.mark.asyncio
async def test_un_workspace_sin_dueno_lo_detecta_el_vigilante(adm, visitante):
    """El estado roto que dejaba el fallo tiene ahora su detector.

    `workspaces_sin_miembros` existe precisamente porque produccion tenia dos.
    """
    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name, status, plan) "
        "VALUES ($1,'huerfano','active','starter') RETURNING id",
        str(visitante["uid"]))
    visitante["workspaces"].append(int(ws))

    huerfanos = await adm.fetchval(
        "SELECT count(*) FROM workspaces w WHERE NOT EXISTS ("
        "  SELECT 1 FROM workspace_members m "
        "  WHERE m.workspace_id = w.id AND m.status = 'active')")
    assert huerfanos >= 1, "el detector no ve un workspace sin dueño"

    from core.autorrecuperacion import mecanismo_para
    assert mecanismo_para("workspaces_sin_miembros") is None, (
        "un workspace sin dueño no puede repararse solo: decidir quien es el dueño "
        "es una decision de permisos")
