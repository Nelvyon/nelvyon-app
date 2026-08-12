"""
El derecho de uso lo concede el pago, no una peticion HTTP.

HALLAZGO, medido ejecutandolo antes de corregir nada:

    POST /api/v1/entities/subscriptions
    {"workspace_id": 1, "plan_id": "enterprise", "status": "active", ...}

devolvia 201 con rol `operator` —ni siquiera admin— y sin
`stripe_subscription_id`. Acto seguido:

    get_active_plan_id_for_workspace(db, 1)  ->  "enterprise"

porque el plan comercial se resuelve con
`SELECT plan_id FROM subscriptions WHERE workspace_id = :ws AND status = 'active'
ORDER BY id DESC LIMIT 1` (`services/plan_quota.py:26`). Una fila activa concede
el plan de inmediato, con sus cuotas y sus limites. Sin pago.

POR QUE CERRARLO AQUI NO ROMPE EL COBRO
---------------------------------------
`services/billing_sync.py` se describe como "shared subscription write-path from
Stripe (checkout verify + webhooks)" y escribe con `SubscriptionsService`
DIRECTAMENTE. El router CRUD es un camino paralelo que ningun consumidor usa: no
hay una sola referencia a `/api/v1/entities/subscriptions` fuera de sus propios
tests. El flujo legitimo crea la fila en `pending` y Stripe la activa.

QUE SE PROHIBE EXACTAMENTE
--------------------------
Solo los campos que deciden que se factura y que se puede usar. Crear una fila
`pending` sigue permitido, que es lo que hace el flujo real.
"""
from __future__ import annotations

import ast

import pytest
from httpx import AsyncClient

RUTA = "/api/v1/entities/subscriptions"


def _cuerpo(**extra):
    base = {
        "workspace_id": 1,
        "plan_id": "starter",
        "billing_cycle": "monthly",
        "status": "pending",
    }
    base.update(extra)
    return base


@pytest.mark.asyncio
@pytest.mark.parametrize("estado", ["active", "trialing", "ACTIVE", " Active "])
async def test_no_se_puede_crear_una_suscripcion_ya_activa(
    client: AsyncClient, operator_headers: dict, estado
):
    """El caso exacto del hallazgo, incluidas sus variantes de forma."""
    r = await client.post(RUTA, headers=operator_headers, json=_cuerpo(status=estado))
    assert r.status_code == 403, f"status={estado!r} aceptado: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_el_plan_efectivo_no_cambia_tras_el_intento(
    client: AsyncClient, operator_headers: dict, db_session
):
    """
    Lo que de verdad importa no es el codigo de respuesta: es que el workspace
    NO acabe con derecho a enterprise.
    """
    from services.plan_quota import get_active_plan_id_for_workspace

    antes = await get_active_plan_id_for_workspace(db_session, 1)
    await client.post(
        RUTA, headers=operator_headers, json=_cuerpo(plan_id="enterprise", status="active")
    )
    despues = await get_active_plan_id_for_workspace(db_session, 1)
    assert despues == antes, f"el plan efectivo paso de {antes!r} a {despues!r} sin pago"
    assert despues != "enterprise"


@pytest.mark.asyncio
async def test_crear_pendiente_sigue_permitido(client: AsyncClient, operator_headers: dict):
    """
    Contraprueba imprescindible: los 403 de arriba no pueden venir de haber
    cerrado el endpoint entero. El flujo legitimo crea en `pending`.
    """
    r = await client.post(RUTA, headers=operator_headers, json=_cuerpo())
    assert r.status_code == 201, f"se rompio el flujo legitimo: {r.status_code} {r.text[:200]}"
    assert r.json().get("status") == "pending"


@pytest.mark.asyncio
async def test_no_se_puede_activar_una_suscripcion_existente(
    client: AsyncClient, operator_headers: dict
):
    """Crear en `pending` y luego actualizar a `active` es el mismo agujero."""
    creada = await client.post(RUTA, headers=operator_headers, json=_cuerpo())
    assert creada.status_code == 201, creada.text[:200]
    sub_id = creada.json()["id"]

    r = await client.put(f"{RUTA}/{sub_id}", headers=operator_headers, json={"status": "active"})
    assert r.status_code == 403, f"se pudo activar: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_no_se_puede_cambiar_el_plan_de_una_suscripcion(
    client: AsyncClient, operator_headers: dict
):
    """Cambiar `plan_id` es cambiar lo que se factura."""
    creada = await client.post(RUTA, headers=operator_headers, json=_cuerpo())
    sub_id = creada.json()["id"]

    r = await client.put(f"{RUTA}/{sub_id}", headers=operator_headers, json={"plan_id": "enterprise"})
    assert r.status_code == 403, f"se cambio el plan: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_no_se_puede_inventar_una_referencia_de_stripe(
    client: AsyncClient, operator_headers: dict
):
    """
    Falsificar `stripe_subscription_id` haria que la fila pareciese pagada ante
    cualquier reconciliacion posterior.
    """
    creada = await client.post(RUTA, headers=operator_headers, json=_cuerpo())
    sub_id = creada.json()["id"]

    r = await client.put(
        f"{RUTA}/{sub_id}", headers=operator_headers, json={"stripe_subscription_id": "sub_falso"}
    )
    assert r.status_code == 403, f"se falsifico la referencia: {r.status_code} {r.text[:200]}"


@pytest.mark.asyncio
async def test_el_owner_tampoco_puede_autoconcederse_el_plan(
    client: AsyncClient, auth_headers: dict
):
    """
    No es un problema de rol: subir la autoridad no lo arreglaria. Ni el
    propietario del workspace decide que plan tiene contratado.
    """
    r = await client.post(
        RUTA, headers=auth_headers, json=_cuerpo(plan_id="enterprise", status="active")
    )
    assert r.status_code == 403, f"el owner se autoconcedio el plan: {r.text[:200]}"


def test_el_camino_de_stripe_no_pasa_por_este_router():
    """
    Si algun dia el flujo de cobro empezase a activar por HTTP, esta guarda lo
    bloquearia y el sintoma seria "los pagos no activan el plan". Se fija aqui la
    razon por la que hoy no ocurre.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "services" / "billing_sync.py").read_text(
        encoding="utf-8"
    )
    assert "SubscriptionsService" in src, "billing_sync ya no escribe por el servicio"
    assert "entities/subscriptions" not in src, "billing_sync empezo a usar el router HTTP"


# ═══════════════════════════════ reembolsos y verificacion de pago

@pytest.mark.asyncio
async def test_ningun_rol_de_workspace_puede_reembolsar(
    client: AsyncClient, auth_headers: dict, operator_headers: dict, member_headers: dict,
    monkeypatch,
):
    """
    HALLAZGO: `charge_id` venia del cuerpo y no se comprobaba contra nada.
    `PaymentService.refund_payment` llama a `stripe.Refund.create_async(charge=...)`
    sobre la cuenta Stripe de NELVYON, asi que un admin de cualquier workspace
    podia reembolsar el cargo de OTRO workspace conociendo su id.

    La cuenta Stripe es un recurso corporativo unico — misma clase que la cuenta
    de Ads o la de SES — luego la autoridad es de plataforma.
    """
    from services import payment as servicio_pago

    reembolsos: list = []

    async def _espia(*_a, **k):
        reembolsos.append(k)
        return {"status": "refunded"}

    monkeypatch.setattr(
        servicio_pago.PaymentService, "refund_payment", _espia, raising=True
    )

    for quien, cabeceras in (("owner", auth_headers), ("operator", operator_headers),
                             ("member", member_headers)):
        r = await client.post(
            "/api/v1/payment/refund",
            headers=cabeceras,
            json={"charge_id": "ch_de_otro_workspace", "amount_cents": 5000},
        )
        assert r.status_code == 403, f"{quien}: {r.status_code} {r.text[:200]}"

    # La propiedad real: el dinero no llego a moverse en ninguno de los tres.
    assert reembolsos == [], f"se llego a reembolsar: {reembolsos}"


@pytest.mark.asyncio
async def test_el_superadmin_si_puede_reembolsar(
    client: AsyncClient, super_admin_headers: dict, monkeypatch
):
    """Contraprueba: los 403 anteriores no son la ruta rota."""
    from services import payment as servicio_pago

    llamadas: list = []

    async def _espia(*_a, **k):
        llamadas.append(k)
        return {"status": "refunded", "refund_id": "re_fake", "amount": 5000, "currency": "eur"}

    monkeypatch.setattr(servicio_pago.PaymentService, "refund_payment", _espia, raising=True)

    r = await client.post(
        "/api/v1/payment/refund",
        headers=super_admin_headers,
        json={"charge_id": "ch_x", "amount_cents": 5000},
    )
    assert r.status_code == 200, r.text[:200]
    assert len(llamadas) == 1


def test_el_reembolso_no_depende_de_un_id_del_cuerpo_sin_comprobar():
    """
    Regresion de la forma del defecto: si vuelve una autoridad de workspace,
    el id del cuerpo vuelve a decidir de que cuenta sale el dinero.

    Se lee la firma por AST y no cortando texto: el primer intento recortaba por
    `") ->"`, que este endpoint no tiene, y acababa arrastrando las funciones de
    al lado — dando un fallo que no era del endpoint auditado.
    """
    from pathlib import Path

    from tests.test_workspace_mutation_authz_guard import _dependencias

    ruta = Path(__file__).resolve().parent.parent / "routers" / "payments.py"
    arbol = ast.parse(ruta.read_text(encoding="utf-8"))
    encontrada = [
        n for n in ast.walk(arbol)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == "refund_payment"
    ]
    assert encontrada, "refund_payment ya no existe"
    deps = _dependencias(encontrada[0])
    assert "get_super_admin_user" in deps, f"el reembolso perdio autoridad de plataforma: {deps}"
    assert not any(d.startswith("require_workspace") for d in deps), (
        f"el reembolso volvio a autoridad de workspace: {sorted(deps)}")


def test_la_verificacion_de_pago_falla_cerrada_sin_workspace_en_la_sesion():
    """
    `verify_payment` comprobaba `if meta_ws and ...`: una sesion sin
    `workspace_id` en metadata SALTABA la comprobacion, de modo que cualquier
    workspace podia verificarla y activarse la suscripcion con el pago de otro.

    Toda sesion creada por NELVYON lleva ese metadato, asi que su ausencia solo
    puede venir de fuera — justo el caso que no debe pasar.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "payments.py").read_text(
        encoding="utf-8"
    )
    i = src.index("async def verify_payment(")
    cuerpo = src[i:i + 2500]
    assert "if not meta_ws:" in cuerpo, "volvio el fail-open cuando falta el metadato"
    assert "does not declare a workspace" in cuerpo
