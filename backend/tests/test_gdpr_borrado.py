"""El borrado de datos personales: 775 lineas que no probaba nadie.

POR QUE IMPORTA MAS QUE OTRAS
-----------------------------
`delete_user_data` es destructivo, lo dispara un cliente y tiene consecuencias
legales. Que estuviera sin una sola prueba significaba que nadie podia responder
dos preguntas: ¿borra lo que debe? y ¿borra SOLO lo que debe?

DOS DEFECTOS REALES QUE ESTA BATERIA FIJA
-----------------------------------------
1. `DELETE FROM campaign_recipients WHERE lower(email) = :email`, sin filtro de
   inquilino, cuando las otras sentencias del mismo metodo si lo llevaban — y
   cuando el camino de EXPORTACION, en el mismo fichero, ya sabia acotarlo con
   un JOIN a `campaigns`. La peticion de borrado de un cliente habria borrado
   los destinatarios con ese correo de todos los demas inquilinos.

2. Los fallos del purgado se tragaban con `logger.debug` y la peticion se
   marcaba `completed` igualmente. A una persona se le decia que sus datos se
   habian borrado cuando no era cierto.
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


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_async() -> str:
    return _dsn().replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")


@pytest.fixture
async def dos_inquilinos():
    """A y B, con el MISMO correo en los dos. Ahi es donde se ve la fuga."""
    asyncpg = pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    adm = await asyncpg.connect(_dsn(), timeout=30)
    marca = secrets.token_hex(4)
    # El sujeto del borrado existe en A y tambien en B, que es el caso real: la
    # misma persona es cliente de dos agencias distintas.
    sujeto = f"sujeto-{marca}@ejemplo.invalid"
    ws = {}
    for n in ("A", "B"):
        uid = await adm.fetchval(
            "INSERT INTO nelvyon_users (email, password_hash, full_name) "
            "VALUES ($1,'x',$2) RETURNING user_id",
            f"gdpr-{n}-{marca}@certificacion.invalid", f"GDPR {n}")
        ident = await adm.fetchval(
            "INSERT INTO workspaces (user_id, name, status, plan) "
            "VALUES ($1,$2,'active','starter') RETURNING id",
            str(uid), f"CERTIFICATION-GDPR-{n}-{marca}")
        await adm.execute(
            "INSERT INTO bookings (workspace_id, user_id, client_email, client_name, "
            "booking_date, booking_time, confirmation_token) "
            "VALUES ($1,$2,$3,$4, CURRENT_DATE, '10:00', $5)",
            ident, str(uid), sujeto, f"Reserva de {n}", secrets.token_hex(8))
        ws[n] = {"id": int(ident), "uid": uid}

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        yield {"ws": ws, "adm": adm, "maker": maker, "sujeto": sujeto}
    finally:
        ids = [v["id"] for v in ws.values()]
        for t in ("bookings", "invoices", "data_deletion_requests", "crm_contacts"):
            try:
                await adm.execute(
                    f"DELETE FROM {t} WHERE workspace_id = ANY($1::int[])", ids)
            except Exception:  # noqa: BLE001
                pass
        await adm.execute("DELETE FROM workspaces WHERE id = ANY($1::int[])", ids)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])",
                          [v["uid"] for v in ws.values()])
        await adm.close()
        await motor.dispose()


# ═══════════════════════════════════════════════════════════════════════════
# Aislamiento: borrar para A no puede tocar a B
# ═══════════════════════════════════════════════════════════════════════════


async def test_borrar_para_un_inquilino_no_toca_al_otro(dos_inquilinos):
    """LA PRUEBA QUE FALTABA.

    El mismo correo existe en A y en B. Borrar para A tiene que dejar B intacto.
    """
    from services.gdpr_service import GDPRService

    adm, sujeto = dos_inquilinos["adm"], dos_inquilinos["sujeto"]
    a, b = dos_inquilinos["ws"]["A"], dos_inquilinos["ws"]["B"]

    assert await adm.fetchval(
        "SELECT count(*) FROM bookings WHERE workspace_id=$1 AND client_email=$2",
        b["id"], sujeto) == 1

    async with dos_inquilinos["maker"]() as s:
        await GDPRService(s, a["id"])._purge_by_email(sujeto)
        await s.commit()

    assert await adm.fetchval(
        "SELECT count(*) FROM bookings WHERE workspace_id=$1 AND client_email=$2",
        a["id"], sujeto) == 0, "no borro lo que tenia que borrar"
    assert await adm.fetchval(
        "SELECT count(*) FROM bookings WHERE workspace_id=$1 AND client_email=$2",
        b["id"], sujeto) == 1, (
        "borro datos del inquilino VECINO: una peticion legitima de un cliente "
        "acaba de destruir datos de otro")


async def test_toda_sentencia_de_purgado_acota_por_inquilino():
    """Guard: ninguna sentencia del purgado sin filtro de workspace.

    El defecto original era exactamente esto: una sentencia acotada y otra que se
    olvido. Leer el codigo no basta, hay que exigirlo.

    LA PRIMERA VERSION DE ESTE GUARD MIRABA DONDE NO DEBIA
    ------------------------------------------------------
    Inspeccionaba el cuerpo de `_purge_by_email` con expresiones regulares. Al
    mover las sentencias a `_PURGADO` dejo de encontrar ninguna… y habria pasado
    en verde sin revisar nada. Lo delato su propia comprobacion de que estaba
    mirando algo (`revisadas >= 3`), que es la razon de que un guard deba
    comprobar SIEMPRE que no esta vacio.

    Ahora se leen las sentencias declaradas, que es donde estan.
    """
    from services.gdpr_service import GDPRService

    declaradas = GDPRService._PURGADO
    assert len(declaradas) >= 2, (
        f"solo {len(declaradas)} sentencias declaradas: el guard no esta "
        "mirando lo que cree que mira")

    for tabla, stmt in declaradas:
        assert "workspace_id" in stmt, (
            f"la sentencia de '{tabla}' no acota por inquilino: "
            f"{stmt.strip()[:120]}")
        # Un `DELETE` con JOIN tiene que filtrar por el workspace de la tabla
        # unida, no por una columna que quiza no exista.
        assert ":workspace_id" in stmt, (
            f"la sentencia de '{tabla}' menciona workspace_id pero no lo enlaza")


# ═══════════════════════════════════════════════════════════════════════════
# `completed` significa completado
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_purgado_que_falla_no_se_reporta_como_completado(dos_inquilinos):
    """LA SEGUNDA PRUEBA DISCRIMINANTE.

    Antes, una sentencia que reventaba se tragaba con `logger.debug` y la
    peticion se marcaba `completed`. Aqui se retira de verdad el privilegio de
    borrar `bookings`, asi que el fallo es real y no simulado.
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.gdpr_service import GDPRService

    adm = dos_inquilinos["adm"]
    a = dos_inquilinos["ws"]["A"]
    sujeto = dos_inquilinos["sujeto"]

    await adm.execute("ALTER ROLE nelvyon_app LOGIN PASSWORD 'cert_app_tmp'")
    base = _dsn()
    motor_app = create_async_engine(
        (base.split("://")[0] + "+asyncpg://nelvyon_app:cert_app_tmp@"
         + base.split("@", 1)[1]).replace("@localhost:", "@127.0.0.1:"))
    await adm.execute("REVOKE DELETE ON bookings FROM nelvyon_app")
    try:
        async with async_sessionmaker(motor_app, expire_on_commit=False)() as s:
            await s.execute(text("SELECT set_config('app.tenant_id', :t, true)"),
                            {"t": str(a["id"])})
            fallos = await GDPRService(s, a["id"])._purge_by_email(sujeto)
        assert fallos, "el purgado fallo y no lo dijo"
        assert any("bookings" in f for f in fallos), fallos
    finally:
        await adm.execute("GRANT DELETE ON bookings TO nelvyon_app")
        await adm.execute("ALTER ROLE nelvyon_app NOLOGIN")
        await motor_app.dispose()


async def test_un_purgado_sin_incidencias_si_devuelve_vacio(dos_inquilinos):
    """Control negativo: si siempre reportara fallos, la prueba anterior no
    significaria nada."""
    from services.gdpr_service import GDPRService

    async with dos_inquilinos["maker"]() as s:
        fallos = await GDPRService(
            s, dos_inquilinos["ws"]["A"]["id"])._purge_by_email(
                dos_inquilinos["sujeto"])
        await s.commit()
    assert fallos == [], f"reporto fallos donde no los hay: {fallos}"


async def test_el_estado_final_refleja_lo_que_de_verdad_paso(dos_inquilinos):
    """`completed` solo si se completo; `failed` si algo quedo sin purgar."""
    from services.gdpr_service import GDPRService

    a = dos_inquilinos["ws"]["A"]
    async with dos_inquilinos["maker"]() as s:
        r = await GDPRService(s, a["id"]).delete_user_data(str(a["uid"]))

    assert r["status"] in ("completed", "failed")
    assert "no_purgado" in r, "no dice que quedo sin purgar"
    if r["no_purgado"]:
        assert r["status"] == "failed", (
            "quedo algo sin purgar y aun asi se reporta completado")

    fila = await dos_inquilinos["adm"].fetchrow(
        "SELECT status FROM data_deletion_requests WHERE id = $1::uuid",
        r["request_id"])
    assert fila is not None, "no quedo constancia de la peticion"
    assert fila["status"] == r["status"], "la fila y la respuesta no coinciden"


async def test_un_fallo_no_impide_purgar_lo_demas():
    """Cada sentencia en su savepoint.

    Sin el, la primera que revienta aborta la transaccion entera y las siguientes
    ni se intentan ni se pueden registrar. Es el mismo defecto que ya aparecio en
    el executor de Autopilot y en el vigilante.
    """
    import inspect

    from services.gdpr_service import GDPRService

    fuente = inspect.getsource(GDPRService._purge_by_email)
    assert "begin_nested" in fuente, (
        "sin savepoint, la primera sentencia que falle aborta la transaccion y "
        "las demas ni se intentan ni se pueden registrar")


async def test_una_tabla_ausente_no_es_un_fallo_de_purgado(dos_inquilinos):
    """`campaign_recipients` no existe en este despliegue.

    Tratarlo como fallo marcaria como fallida TODA peticion de borrado del
    sistema y volveria el estado inutil. Es informacion distinta de «no se pudo
    borrar»: una es un despliegue sin esa tabla, la otra es un dato que sigue ahi.
    """
    from services.gdpr_service import GDPRService

    async with dos_inquilinos["maker"]() as s:
        fallos = await GDPRService(
            s, dos_inquilinos["ws"]["A"]["id"])._purge_by_email(
                dos_inquilinos["sujeto"])
        await s.commit()
    assert not any("campaign_recipients" in f for f in fallos), fallos


async def test_invoices_sigue_sin_datos_personales(dos_inquilinos):
    """EL GUARD DEL TERCER DEFECTO.

    Habia una sentencia que anonimizaba `invoices.client_name`, `client_email`,
    `client_nif` y `client_address`. Ninguna existe: la sentencia no funciono
    jamas y el `logger.debug` lo tapo durante todo ese tiempo.

    Se retiro porque esa tabla no guarda datos personales. Si algun dia los
    guarda, esta prueba falla y obliga a volver a incluirla en el purgado — en
    vez de descubrirlo cuando alguien ejerza su derecho al borrado.
    """
    cols = {r["column_name"] for r in await dos_inquilinos["adm"].fetch(
        "SELECT column_name FROM information_schema.columns "
        " WHERE table_name = 'invoices'")}
    personales = {c for c in cols if any(
        k in c for k in ("email", "client_name", "nif", "address", "phone", "dni"))}
    assert not personales, (
        f"`invoices` ha ganado columnas con datos personales {sorted(personales)} "
        "y el purgado de GDPR no las toca. Hay que anadirlas a `_PURGADO`.")


async def test_el_purgado_declara_su_tabla_para_poder_comprobarla(dos_inquilinos):
    """Cada entrada del purgado tiene que decir sobre que tabla actua.

    Sin eso no se puede distinguir «ausente» de «fallo», que es justo la
    distincion que hace util el estado de la peticion.
    """
    from services.gdpr_service import GDPRService

    assert GDPRService._PURGADO, "el purgado no declara nada"
    for tabla, stmt in GDPRService._PURGADO:
        assert tabla and tabla.isidentifier(), f"tabla mal declarada: {tabla!r}"
        assert tabla in stmt, f"la sentencia de {tabla} no menciona su tabla"
        assert "workspace_id" in stmt, (
            f"la sentencia de {tabla} no acota por inquilino")
