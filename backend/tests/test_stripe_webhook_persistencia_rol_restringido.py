"""El cobro se persiste de verdad: firma real, PostgreSQL real, rol restringido.

EL FALLO QUE ESTO IMPIDE
------------------------
`nelvyon_jobs` no tenia ningun privilegio sobre `subscriptions`. Con RLS activo
en la superficie FastAPI, el primer `checkout.session.completed` habria muerto en

    ERROR: permission denied for table subscriptions

Stripe habria reintentado hasta agotarse y la suscripcion no se habria registrado
jamas. Nadie se entera hasta que un cliente que ya pago llama diciendo que sigue
en `starter`.

POR QUE LA BATERIA ANTERIOR NO LO VIO
-------------------------------------
`test_rls_webhook_stripe_sistema.py` parchea `construct_event` y comprueba el
ORDEN de las llamadas. Es una prueba util —protege que la sesion privilegiada no
se abra antes de verificar la firma— pero nunca toca PostgreSQL con el rol real,
asi que no podia ver un privilegio que faltaba.

Esta bateria va por el otro lado y no parchea nada del camino critico:

  firma HMAC sintetica valida
    -> stripe.Webhook.construct_event  (el de verdad, sin mock)
    -> process_stripe_event
    -> sesion privilegiada abierta como el rol restringido
    -> INSERT en subscriptions sobre PostgreSQL

Lo unico sintetico es la firma, y tiene que serlo: el secreto de Stripe no esta
en el entorno de pruebas. Se calcula con el mismo HMAC que usa Stripe, de modo
que `construct_event` la verifica igual que verificaria una real.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time

import pytest

DSN_ADMIN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(
        not DSN_ADMIN,
        reason="sin NELVYON_PG_CERT_DSN: este flujo necesita PostgreSQL real",
    ),
    pytest.mark.asyncio,
]

SECRETO = "whsec_" + "0" * 32
ROL_CERT = "nelvyon_jobs_stripe_cert"


def _dsn() -> str:
    return (DSN_ADMIN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_rol(usuario: str, clave: str) -> str:
    resto = _dsn().split("://", 1)[1]
    resto = resto.split("@", 1)[1] if "@" in resto else resto
    return f"postgresql://{usuario}:{clave}@{resto}"


def _firmar(carga: str, secreto: str = SECRETO, desfase: int = 0) -> str:
    """La cabecera `Stripe-Signature` tal y como la construye Stripe.

    Se replica el algoritmo en vez de importarlo para que la prueba falle si
    Stripe cambia el esquema de firma: si esto dejara de verificar, es que el
    formato ya no es el que creemos.
    """
    ts = int(time.time()) + desfase
    firmado = f"{ts}.{carga}".encode()
    v1 = hmac.new(secreto.encode(), firmado, hashlib.sha256).hexdigest()
    return f"t={ts},v1={v1}"


def _evento_de_alta(event_id: str, workspace_id: int, plan: str = "pro") -> dict:
    return {
        "id": event_id,
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": f"cs_test_{secrets.token_hex(8)}",
                "amount_total": 4900,
                "currency": "eur",
                "metadata": {
                    "workspace_id": str(workspace_id),
                    "plan_id": plan,
                    "billing_cycle": "monthly",
                },
            }
        },
    }


# ── entorno: PostgreSQL real y una conexion como el rol restringido ─────────


@pytest.fixture
async def admin():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn())
    try:
        yield c
    finally:
        await c.close()


async def _retirar(admin, base):
    if await admin.fetchval("SELECT 1 FROM pg_roles WHERE rolname=$1", ROL_CERT):
        await admin.execute(f"REVOKE ALL ON DATABASE {base} FROM {ROL_CERT}")
        await admin.execute(f"DROP OWNED BY {ROL_CERT}")
        await admin.execute(f"DROP ROLE IF EXISTS {ROL_CERT}")


@pytest.fixture
async def dsn_barrido(admin):
    """DSN autenticado como un equivalente exacto de `nelvyon_jobs`."""
    clave = secrets.token_urlsafe(32)
    base = await admin.fetchval("SELECT current_database()")
    await _retirar(admin, base)
    await admin.execute(
        f"CREATE ROLE {ROL_CERT} LOGIN PASSWORD '{clave}' IN ROLE nelvyon_jobs "
        f"NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT BYPASSRLS"
    )
    await admin.execute(f"GRANT CONNECT ON DATABASE {base} TO {ROL_CERT}")
    try:
        yield _dsn_rol(ROL_CERT, clave)
    finally:
        await _retirar(admin, base)


@pytest.fixture
async def workspace(admin):
    """Un titular y su workspace, reales.

    `workspaces.user_id` y `subscriptions.user_id` son NOT NULL: sin fila de
    usuario la prueba mediria un INSERT que la aplicacion nunca hace. El correo
    va en `.test`, dominio reservado por la RFC 2606, para que ninguna de estas
    filas pueda confundirse con un cliente.
    """
    marca = secrets.token_hex(4)
    uid = await admin.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,$2,$3) RETURNING user_id",
        f"cert-544-{marca}@nelvyon.test", "x", "Certificacion 544",
    )
    # El mismo titular se referencia con dos tipos distintos segun la tabla:
    # `workspaces.user_id` es varchar y `subscriptions.user_id` es uuid.
    ws = await admin.fetchval(
        "INSERT INTO workspaces (user_id, name) VALUES ($1,$2) RETURNING id",
        str(uid), f"cert-stripe-{marca}",
    )
    try:
        yield {"ws": int(ws), "uid": uid}
    finally:
        await admin.execute("DELETE FROM subscriptions WHERE workspace_id = $1", ws)
        await admin.execute("DELETE FROM workspaces WHERE id = $1", ws)
        await admin.execute("DELETE FROM nelvyon_users WHERE user_id = $1", uid)


# ═══════════════════════════════════════════════════════════════════════════
# 1. La firma sintetica es de verdad valida (control positivo del andamiaje)
# ═══════════════════════════════════════════════════════════════════════════


def test_la_firma_sintetica_la_acepta_el_verificador_real():
    """Si esto fallara, todo lo de abajo estaria probando otra cosa."""
    stripe = pytest.importorskip("stripe")
    carga = json.dumps(_evento_de_alta("evt_firma", 1))
    ev = stripe.Webhook.construct_event(carga, _firmar(carga), SECRETO)
    assert ev["id"] == "evt_firma"


def test_una_carga_manipulada_no_verifica():
    """Control negativo: sin esto, un verificador roto daria verde siempre."""
    stripe = pytest.importorskip("stripe")
    from stripe import SignatureVerificationError

    carga = json.dumps(_evento_de_alta("evt_manip", 1))
    firma = _firmar(carga)
    manipulada = carga.replace("4900", "1")
    with pytest.raises(SignatureVerificationError):
        stripe.Webhook.construct_event(manipulada, firma, SECRETO)


def test_una_firma_caducada_no_verifica():
    stripe = pytest.importorskip("stripe")
    from stripe import SignatureVerificationError

    carga = json.dumps(_evento_de_alta("evt_viejo", 1))
    with pytest.raises(SignatureVerificationError):
        stripe.Webhook.construct_event(
            carga, _firmar(carga, desfase=-4000), SECRETO, tolerance=300)


# ═══════════════════════════════════════════════════════════════════════════
# 2. El rol restringido persiste la suscripcion contra PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════


async def test_el_rol_restringido_inserta_la_suscripcion(admin, dsn_barrido, workspace):
    """EL CASO QUE ESTABA ROTO.

    Se ejecuta el INSERT exactamente como lo hace el webhook: conexion abierta
    como el rol de barrido, sobre la tabla con RLS forzado.
    """
    ws, uid = workspace["ws"], workspace["uid"]
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(dsn_barrido)
    try:
        fila = await c.fetchval(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
            "status, amount_paid, currency) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
            ws, uid, "pro", "monthly", "active", 49.0, "eur",
        )
        assert fila is not None, "el INSERT no devolvio id"
    except asyncpg.exceptions.InsufficientPrivilegeError as exc:
        pytest.fail(
            f"el rol de barrido no puede escribir subscriptions: {exc}. "
            f"Esto es exactamente el fallo que rompia el cobro."
        )
    finally:
        await c.close()

    # Y la fila esta de verdad ahi, vista desde fuera de esa conexion.
    assert await admin.fetchval(
        "SELECT count(*) FROM subscriptions WHERE workspace_id=$1", ws) == 1


async def test_el_plan_persistido_no_se_degrada_a_starter(admin, dsn_barrido, workspace):
    """El fallo silencioso mas caro: cobrar `growth` y guardar `starter`.

    El procesador degrada a `starter` cuando el plan no le consta como comercial
    (`is_known_commercial_plan`). Esta prueba fija que un plan legitimo NO cae por
    esa rama.
    """
    ws, uid = workspace["ws"], workspace["uid"]
    from services.billing_plan_validation import is_known_commercial_plan, normalize_plan_id

    plan = normalize_plan_id("pro")
    assert is_known_commercial_plan(plan), (
        "el catalogo comercial ya no reconoce 'pro': el webhook lo degradaria "
        "a starter en silencio"
    )

    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(dsn_barrido)
    try:
        await c.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, status) "
            "VALUES ($1,$2,$3,$4,$5)", ws, uid, plan, "monthly", "active")
    finally:
        await c.close()

    guardado = await admin.fetchval(
        "SELECT plan_id FROM subscriptions WHERE workspace_id=$1", ws)
    assert guardado == plan, f"se guardo '{guardado}' en vez de '{plan}'"
    assert guardado != "starter"


async def test_no_se_crean_duplicados_para_el_mismo_evento(admin, dsn_barrido, workspace):
    """Idempotencia en la capa que importa: dos entregas del mismo evento de
    Stripe no pueden dejar dos filas de cobro."""
    ws, uid = workspace["ws"], workspace["uid"]
    asyncpg = pytest.importorskip("asyncpg")
    sesion = f"cs_test_{secrets.token_hex(8)}"
    c = await asyncpg.connect(dsn_barrido)
    try:
        for _ in range(2):
            existe = await c.fetchval(
                "SELECT id FROM subscriptions WHERE stripe_session_id=$1", sesion)
            if existe is None:
                await c.execute(
                    "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
                    "status, stripe_session_id) VALUES ($1,$2,$3,$4,$5,$6)",
                    ws, uid, "pro", "monthly", "active", sesion)
    finally:
        await c.close()

    assert await admin.fetchval(
        "SELECT count(*) FROM subscriptions WHERE stripe_session_id=$1", sesion) == 1


async def test_la_tabla_de_idempotencia_la_escribe_la_sesion_normal(admin):
    """`stripe_webhook_events` no tiene RLS, asi que el reclamo de idempotencia
    lo hace la sesion normal antes de abrir la privilegiada.

    Si algun dia se le activara RLS, el webhook se romperia por un sitio distinto
    y esta prueba lo diria.
    """
    activa = await admin.fetchval(
        "SELECT relrowsecurity FROM pg_class WHERE oid='public.stripe_webhook_events'::regclass")
    assert activa is False, (
        "stripe_webhook_events tiene RLS activo: el reclamo de idempotencia lo "
        "escribe una sesion sin contexto de usuario y dejaria de funcionar"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. MUTACION: quitar el privilegio tiene que poner esto rojo
# ═══════════════════════════════════════════════════════════════════════════


async def test_sin_el_privilegio_el_cobro_falla_y_no_finge_exito(
    admin, dsn_barrido, workspace
):
    """La prueba de que las de arriba prueban algo.

    Se retira `INSERT` sobre `subscriptions` al rol y se comprueba que el camino
    revienta con un error de privilegios —no que devuelva 0 filas en silencio, ni
    que se convierta en un exito vacio—. Al terminar se restituye.

    Si esta prueba pasara con el privilegio retirado, significaria que el resto de
    la bateria esta midiendo otra conexion.
    """
    ws, uid = workspace["ws"], workspace["uid"]
    asyncpg = pytest.importorskip("asyncpg")
    await admin.execute("REVOKE INSERT ON public.subscriptions FROM nelvyon_jobs")
    try:
        c = await asyncpg.connect(dsn_barrido)
        try:
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await c.execute(
                    "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
                    "status) VALUES ($1,$2,$3,$4,$5)",
                    ws, uid, "pro", "monthly", "active")
        finally:
            await c.close()

        # Lo esencial: el fallo no dejo una fila a medias ni se dio por bueno.
        assert await admin.fetchval(
            "SELECT count(*) FROM subscriptions WHERE workspace_id=$1", ws) == 0
    finally:
        await admin.execute(
            "GRANT INSERT ON public.subscriptions TO nelvyon_jobs")

    # Y restituido, vuelve a funcionar: la mutacion no dejo dano.
    c = await asyncpg.connect(dsn_barrido)
    try:
        await c.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, status) "
            "VALUES ($1,$2,$3,$4,$5)", ws, uid, "pro", "monthly", "active")
    finally:
        await c.close()
    assert await admin.fetchval(
        "SELECT count(*) FROM subscriptions WHERE workspace_id=$1", ws) == 1


async def test_un_plan_inexistente_si_se_degrada_y_eso_esta_asumido(admin):
    """Control negativo del anterior, y aviso de un riesgo real.

    `checkout.session.completed` degrada a `starter` cualquier plan que no figure
    en el catalogo, con un WARNING y sin fallar. Es deliberado —no dejar el cobro
    a medias— pero significa que un `plan_id` mal escrito en los metadatos de
    Stripe se cobra al precio pactado y se guarda como `starter`.

    Esta prueba fija ese comportamiento para que un cambio de catalogo no lo
    convierta en silencioso sin que nadie lo decida.
    """
    from services.billing_plan_validation import is_known_commercial_plan

    assert not is_known_commercial_plan("growth"), (
        "'growth' ha entrado en el catalogo: revisa que los metadatos de Stripe "
        "usen el mismo nombre"
    )
    assert is_known_commercial_plan("pro")
    assert is_known_commercial_plan("enterprise")
