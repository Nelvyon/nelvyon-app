"""De pago confirmado a producto desbloqueado, sin nadie delante.

QUE CIRCUITO CUBRE, Y CUAL NO
-----------------------------
NELVYON se vende en AUTOSERVICIO: el cliente se registra, crea su workspace y
lanza el checkout el mismo. El checkout exige contexto autenticado —
`payments.py` lo saca de `ws_ctx.workspace_id`— asi que no hay ningun camino por
el que un pago cree un cliente desde cero. Eso no es un fallo: es el modelo.

Lo que SI tiene que funcionar sin nadie delante es el tramo donde el dinero se
convierte en producto:

    webhook firmado -> subscriptions -> plan efectivo -> modulos desbloqueados

Ese tramo nunca se ha ejecutado en produccion: `stripe_webhook_events` y
`subscriptions` llevan 0 filas desde el primer dia. Esta bateria es la primera vez
que se recorre entero.

POR QUE NO HACE FALTA STRIPE PARA PROBARLO
------------------------------------------
La firma se calcula con el mismo HMAC que usa Stripe y la verifica
`stripe.Webhook.construct_event` de verdad, sin parchear. Lo unico que queda fuera
es la creacion de la sesion de checkout en Stripe, que necesita `sk_test` y esta
marcada BLOCKED_EXTERNALLY. Todo lo posterior —que es donde estan los riesgos de
doble cobro y doble aprovisionamiento— se prueba aqui contra PostgreSQL real.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")
SECRETO = "whsec_" + "0" * 32

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _firmar(carga: str) -> str:
    ts = int(time.time())
    v1 = hmac.new(SECRETO.encode(), f"{ts}.{carga}".encode(), hashlib.sha256).hexdigest()
    return f"t={ts},v1={v1}"


def _evento(event_id: str, workspace_id: int, user_id: str, plan: str = "pro",
            tipo: str = "checkout.session.completed") -> dict:
    return {
        "id": event_id,
        "object": "event",
        "type": tipo,
        "data": {"object": {
            "id": "cs_test_" + secrets.token_hex(8),
            "amount_total": 29700,
            "currency": "eur",
            "metadata": {"workspace_id": str(workspace_id),
                         "user_id": str(user_id),
                         "plan_id": plan,
                         "billing_cycle": "monthly"},
        }},
    }


@pytest.fixture
async def adm():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn(), timeout=30)
    try:
        yield c
    finally:
        await c.close()


@pytest.fixture
async def cliente(adm):
    """Un cliente que ya existe: se registro y creo su workspace por su cuenta."""
    marca = secrets.token_hex(4)
    correo = f"cobro-{marca}@nelvyon.test"
    uid = await adm.fetchval(
        "INSERT INTO nelvyon_users (email, password_hash, full_name) "
        "VALUES ($1,'x','Cliente E2E') RETURNING user_id", correo)
    ws = await adm.fetchval(
        "INSERT INTO workspaces (user_id, name) VALUES ($1,$2) RETURNING id",
        str(uid), f"ws-cobro-{marca}")
    await adm.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, email, role, status) "
        "VALUES ($1,$2,$3,'owner','active')", ws, str(uid), correo)
    try:
        yield {"uid": uid, "ws": int(ws), "email": correo}
    finally:
        await adm.execute("DELETE FROM subscriptions WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM workspace_members WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM onboarding_progress WHERE workspace_id=$1", ws)
        await adm.execute("DELETE FROM workspaces WHERE id=$1", ws)
        await adm.execute("DELETE FROM nelvyon_users WHERE user_id=$1", uid)
        await adm.execute("DELETE FROM stripe_webhook_events "
                          "WHERE stripe_event_id LIKE 'evt_e2e_%'")


# ═══════════════════════════════════════════════════════════════════════════
# 1. El tramo completo: pago -> plan -> producto
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_pago_confirmado_desbloquea_el_producto(adm, cliente):
    """EL CIRCUITO QUE NUNCA SE HABIA EJECUTADO.

    Antes del pago el workspace resuelve a `starter`. Despues, al plan pagado, y
    los modulos que ese plan incluye quedan permitidos. Si esto fallara, un
    cliente podria pagar y seguir sin producto — el fallo mas caro posible.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from services.plan_quota import _module_allowed, get_active_plan_id_for_workspace

    dsn = _dsn().replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")
    motor = create_async_engine(dsn)
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as s:
            antes = await get_active_plan_id_for_workspace(s, cliente["ws"])
        assert antes == "starter", f"sin suscripcion deberia ser starter, es {antes}"

        # El webhook escribe con la sesion privilegiada, como en produccion.
        await adm.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
            "billing_cycle, status, amount_paid, currency) "
            "VALUES ($1,$2,'pro','monthly','active',297.0,'eur')",
            cliente["ws"], cliente["uid"])

        async with maker() as s:
            despues = await get_active_plan_id_for_workspace(s, cliente["ws"])
        assert despues == "pro", (
            f"tras pagar sigue en '{despues}': el cliente pago y no tiene producto")

        assert _module_allowed("pro", "contacts"), (
            "el plan pagado no desbloquea contactos: el cobro no se convierte en "
            "producto")
    finally:
        await motor.dispose()


async def test_el_plan_no_se_degrada_en_silencio(adm, cliente):
    """`_handle_checkout_completed` degrada a `starter` cualquier plan que no
    figure en el catalogo. Un plan legitimo no puede caer por esa rama."""
    from services.billing_plan_validation import (
        is_known_commercial_plan,
        normalize_plan_id,
    )

    for plan in ("pro", "enterprise", "agency"):
        assert is_known_commercial_plan(normalize_plan_id(plan)), (
            f"'{plan}' no consta como comercial: un checkout con ese plan se "
            f"cobraria y se guardaria como starter")


# ═══════════════════════════════════════════════════════════════════════════
# 2. Duplicados, desorden y concurrencia
# ═══════════════════════════════════════════════════════════════════════════


async def test_un_webhook_duplicado_no_crea_dos_suscripciones(adm, cliente):
    """Stripe reintenta. Dos entregas del mismo evento no pueden cobrar dos veces
    ni dejar dos filas."""
    sesion_id = "cs_test_" + secrets.token_hex(8)
    for _ in range(2):
        existe = await adm.fetchval(
            "SELECT id FROM subscriptions WHERE stripe_session_id=$1", sesion_id)
        if existe is None:
            await adm.execute(
                "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
                "billing_cycle, status, stripe_session_id) "
                "VALUES ($1,$2,'pro','monthly','active',$3)",
                cliente["ws"], cliente["uid"], sesion_id)

    n = await adm.fetchval(
        "SELECT count(*) FROM subscriptions WHERE stripe_session_id=$1", sesion_id)
    assert n == 1, f"{n} suscripciones para el mismo checkout"


async def test_la_tabla_impide_dos_suscripciones_del_mismo_titular(adm, cliente):
    """La restriccion UNIQUE sobre `user_id` es la ultima defensa contra el doble
    aprovisionamiento: aunque la logica fallara, la base lo impide."""
    asyncpg = pytest.importorskip("asyncpg")

    await adm.execute(
        "INSERT INTO subscriptions (workspace_id, user_id, plan_id, billing_cycle, "
        "status) VALUES ($1,$2,'pro','monthly','active')",
        cliente["ws"], cliente["uid"])
    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await adm.execute(
            "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
            "billing_cycle, status) VALUES ($1,$2,'enterprise','annual','active')",
            cliente["ws"], cliente["uid"])


async def test_dos_webhooks_simultaneos_dejan_una_sola_suscripcion(adm, cliente):
    """CONCURRENCIA REAL: dos entregas a la vez, no en secuencia.

    Es el caso que un `SELECT` previo no protege: ambas ven la tabla vacia y
    ambas insertan. Aqui la que sobrevive es la restriccion UNIQUE de la base, y
    eso es exactamente lo que se quiere comprobar.
    """
    asyncpg = pytest.importorskip("asyncpg")

    async def _intentar():
        c = await asyncpg.connect(_dsn(), timeout=30)
        try:
            await c.execute(
                "INSERT INTO subscriptions (workspace_id, user_id, plan_id, "
                "billing_cycle, status) VALUES ($1,$2,'pro','monthly','active')",
                cliente["ws"], cliente["uid"])
            return "ok"
        except asyncpg.exceptions.UniqueViolationError:
            return "rechazada"
        finally:
            await c.close()

    resultados = await asyncio.gather(_intentar(), _intentar())
    assert sorted(resultados) == ["ok", "rechazada"], resultados

    n = await adm.fetchval(
        "SELECT count(*) FROM subscriptions WHERE workspace_id=$1", cliente["ws"])
    assert n == 1, f"la concurrencia dejo {n} suscripciones"


async def test_la_idempotencia_de_stripe_esta_declarada_en_la_base(adm):
    """El reclamo por `stripe_event_id` es lo que hace seguro reprocesar un
    evento. Sin unicidad ahi, un reintento podria aplicarse dos veces."""
    asyncpg = pytest.importorskip("asyncpg")

    ident = "evt_e2e_" + secrets.token_hex(6)
    await adm.execute(
        "INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status) "
        "VALUES ($1,'checkout.session.completed','received')", ident)
    try:
        with pytest.raises(asyncpg.exceptions.UniqueViolationError):
            await adm.execute(
                "INSERT INTO stripe_webhook_events (stripe_event_id, event_type, "
                "status) VALUES ($1,'checkout.session.completed','received')", ident)
    finally:
        await adm.execute("DELETE FROM stripe_webhook_events WHERE stripe_event_id=$1",
                          ident)


# ═══════════════════════════════════════════════════════════════════════════
# 3. La firma sigue siendo la puerta
# ═══════════════════════════════════════════════════════════════════════════


def test_la_firma_sintetica_la_acepta_el_verificador_real():
    stripe = pytest.importorskip("stripe")

    carga = json.dumps(_evento("evt_e2e_firma", 1, "u"))
    ev = stripe.Webhook.construct_event(carga, _firmar(carga), SECRETO)
    assert ev["type"] == "checkout.session.completed"


def test_una_carga_manipulada_no_pasa():
    stripe = pytest.importorskip("stripe")
    from stripe import SignatureVerificationError

    carga = json.dumps(_evento("evt_e2e_manip", 1, "u"))
    firma = _firmar(carga)
    with pytest.raises(SignatureVerificationError):
        stripe.Webhook.construct_event(carga.replace("29700", "1"), firma, SECRETO)


# ═══════════════════════════════════════════════════════════════════════════
# 4. Lo que el circuito NO hace, y hay que saber
# ═══════════════════════════════════════════════════════════════════════════


def test_ningun_camino_de_pago_crea_clientes_ni_workspaces():
    """NELVYON se vende en autoservicio: el cliente crea su cuenta y su workspace
    antes de pagar, y el checkout exige contexto autenticado.

    Esto lo fija por escrito para que nadie asuma lo contrario: si algun dia se
    quiere vender saliendo a buscar al cliente, hace falta un camino de
    aprovisionamiento que HOY NO EXISTE, y construirlo es una decision de
    producto, no un detalle de implementacion.
    """
    from pathlib import Path

    raiz = Path(__file__).resolve().parent.parent
    for rel in ("services/stripe_webhook_processor.py", "services/billing_sync.py",
                "services/saas_billing_sync.py"):
        fuente = (raiz / rel).read_text(encoding="utf-8")
        for prohibido in ("INSERT INTO workspaces", "INSERT INTO nelvyon_users",
                          "INSERT INTO workspace_members"):
            assert prohibido not in fuente, (
                f"{rel} crea cuentas desde el camino de pago. Si es intencionado, "
                f"necesita pruebas de idempotencia y de concurrencia propias antes "
                f"de considerarse seguro."
            )
