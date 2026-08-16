"""El webhook de Stripe como ACTOR DE SISTEMA: sesion privilegiada, y solo ahi.

EL PROBLEMA
-----------
`POST /api/v1/stripe/webhook` llega sin JWT y sin usuario: lo llama Stripe, no
una persona. Y tiene que escribir `subscriptions`, cuyas politicas conceden por
titular (`user_id = nelvyon_jwt_user_id()`) o por pertenencia al workspace
(migracion 543). Este camino no tiene ninguna de las dos cosas, asi que bajo un
rol sin BYPASSRLS la escritura fallaria y la sincronizacion de cobros se
pararia.

LA SALIDA, Y SU RIESGO
----------------------
La misma que ya usan los barridos de fondo: el rol `nelvyon_jobs` a traves de
`core.database.sesion_de_barrido()`. Pero eso es una credencial que EVITA RLS
colgada de un endpoint publico, asi que lo unico que la hace aceptable es que
sea estrecha y que este detras de la verificacion de firma. Este fichero
comprueba las dos cosas:

  * que la firma se sigue exigiendo exactamente igual que antes —invalida,
    ausente, y secreto sin configurar—, porque es lo unico que impide que
    cualquiera marque suscripciones como pagadas;
  * que la sesion privilegiada NO se abre siquiera cuando la firma no verifica;
  * que solo la recibe `SubscriptionsService`, y no el resto del handler;
  * y que sin `NELVYON_JOBS_DATABASE_URL` la conducta es identica a la de antes
    de este cambio.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from stripe import SignatureVerificationError

RUTA = "/api/v1/stripe/webhook"


@pytest.fixture
def webhook_client(setup_database):
    """Cliente sin autenticacion: Stripe llama al webhook directamente."""
    from main import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def _evento(event_id: str, tipo: str, obj: Optional[Dict[str, Any]] = None) -> dict:
    return {"id": event_id, "type": tipo, "data": {"object": obj or {}}}


# ═══════════════════════════════════════════════════════════════════════════
# 1. La firma se sigue exigiendo (control negativo: es lo que protege el dinero)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_firma_ausente_se_rechaza(webhook_client: AsyncClient):
    """Sin cabecera `stripe-signature` no se procesa nada.

    Se usa el verificador REAL, no un doble: probar el rechazo con
    `construct_event` parcheado comprobaria el mock, no la puerta.
    """
    r = await webhook_client.post(RUTA, content=b'{"id":"evt_x","type":"ping"}')
    assert r.status_code == 400
    assert r.json().get("detail") == "Invalid signature"


@pytest.mark.asyncio
async def test_firma_invalida_se_rechaza(webhook_client: AsyncClient):
    r = await webhook_client.post(
        RUTA,
        content=b'{"id":"evt_x","type":"ping"}',
        headers={"stripe-signature": "t=1,v1=basura"},
    )
    assert r.status_code == 400
    assert r.json().get("detail") == "Invalid signature"


@pytest.mark.asyncio
async def test_en_produccion_sin_secreto_configurado_no_se_procesa(webhook_client: AsyncClient):
    """503, no 200 silencioso. Un webhook que acepta sin poder verificar es una
    puerta abierta a marcar cobros como pagados."""
    from core.config import settings

    with patch.object(type(settings), "is_production", property(lambda self: True)), patch(
        "routers.stripe_webhook._webhook_secret", return_value=""
    ):
        r = await webhook_client.post(
            RUTA, content=b"{}", headers={"stripe-signature": "t=1,v1=x"}
        )
    assert r.status_code == 503
    assert "not configured" in r.json().get("detail", "")


@pytest.mark.asyncio
async def test_control_positivo_con_firma_valida_si_se_procesa(webhook_client: AsyncClient):
    """Sin esto, los tres tests de arriba pasarian con un endpoint que rechaza
    absolutamente todo, incluido lo legitimo."""
    ev = _evento("evt_sistema_ok", "customer.subscription.updated", {"id": "sub_x", "status": "active"})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        r = await webhook_client.post(
            RUTA, content=b"{}", headers={"stripe-signature": "t=1,v1=x"}
        )
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 2. La sesion privilegiada esta DETRAS de la firma
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_la_sesion_privilegiada_no_se_abre_si_la_firma_no_verifica(
    webhook_client: AsyncClient,
):
    """El orden importa tanto como el hecho.

    Abrir la sesion de `nelvyon_jobs` antes de verificar convertiria cada
    peticion anonima —incluidas las falsas— en una conexion con una credencial
    que evita RLS. Que el codigo la abra despues no basta con leerlo una vez:
    hay que fijarlo.
    """
    from routers import stripe_webhook as router_mod

    llamadas: list[int] = []
    original = router_mod.sesion_de_barrido

    async def _espia():
        llamadas.append(1)
        return await original()

    with patch.object(router_mod, "sesion_de_barrido", _espia):
        # Firma invalida: la sesion privilegiada no debe llegar a abrirse.
        r = await webhook_client.post(
            RUTA, content=b"{}", headers={"stripe-signature": "t=1,v1=basura"}
        )
        assert r.status_code == 400
        assert llamadas == [], (
            "la sesion privilegiada se abrio con una firma invalida: esta por "
            "delante de la verificacion"
        )

        # Control positivo: con firma valida SI se abre. Sin esta mitad, el
        # test pasaria tambien si nadie usara nunca la sesion privilegiada.
        ev = _evento("evt_sistema_firma", "customer.subscription.updated", {"id": "s", "status": "active"})
        with patch("stripe.Webhook.construct_event", return_value=ev):
            r = await webhook_client.post(
                RUTA, content=b"{}", headers={"stripe-signature": "t=1,v1=x"}
            )
        assert r.status_code == 200
        assert llamadas == [1], "con firma valida la sesion privilegiada debe abrirse"


def test_el_argumento_privilegiado_es_opcional_y_solo_por_nombre():
    """La forma del contrato, que es lo que garantiza la regla 3.

    `db_suscripciones` es keyword-only y con default `None`: quien no lo pase
    —cualquier llamador anterior a este cambio, y el propio router mientras no
    haya credencial de jobs— obtiene la conducta de siempre.
    """
    import inspect

    from services import stripe_webhook_processor as proc

    firma = inspect.signature(proc.process_stripe_event)
    parametro = firma.parameters.get("db_suscripciones")
    assert parametro is not None
    assert parametro.kind is inspect.Parameter.KEYWORD_ONLY, (
        "posicional invitaria a pasarlo por error desde otro llamador"
    )
    assert parametro.default is None, (
        "sin el argumento, el procesador debe comportarse como antes del cambio"
    )


@pytest.mark.asyncio
async def test_el_procesador_entrega_la_sesion_privilegiada_al_servicio(setup_database):
    """El recorrido de verdad: un evento real por `process_stripe_event`, con
    dos sesiones distintas, comprobando cual acaba en `SubscriptionsService`."""
    from core.database import db_manager
    from services import stripe_webhook_processor as proc

    recibidas: list[object] = []
    real = proc.SubscriptionsService

    class _Espia(real):  # type: ignore[misc,valid-type]
        def __init__(self, db):
            recibidas.append(db)
            super().__init__(db)

    async with db_manager.async_session_maker() as db_normal:
        async with db_manager.async_session_maker() as db_privilegiada:
            with patch.object(proc, "SubscriptionsService", _Espia):
                salida, _ = await proc.process_stripe_event(
                    db_normal,
                    _evento("evt_dos_sesiones", "customer.subscription.updated", {"id": "s", "status": "active"}),
                    db_suscripciones=db_privilegiada,
                )
            assert salida in ("ok", "unhandled")
            assert recibidas == [db_privilegiada], (
                "la escritura de suscripciones tiene que recibir la sesion "
                "privilegiada, y ninguna otra parte del handler"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 3. Sin `NELVYON_JOBS_DATABASE_URL`, nada cambia
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_sin_credencial_de_jobs_la_sesion_es_la_de_siempre(setup_database, monkeypatch):
    """Regla del cambio: no puede romperse nada por no tener la variable.

    Es lo que permite desplegar este codigo hoy, antes de repartir credenciales,
    sin cambiar una sola respuesta.
    """
    from core.database import db_manager

    monkeypatch.delenv("NELVYON_JOBS_DATABASE_URL", raising=False)
    maker = await db_manager.ensure_jobs_session_maker()
    assert maker is db_manager.async_session_maker, (
        "sin la variable, la sesion de barrido debe ser exactamente la normal"
    )
    assert db_manager.jobs_engine is None, "no debe abrirse ningun motor extra"


@pytest.mark.asyncio
async def test_sin_credencial_de_jobs_el_webhook_responde_igual(webhook_client: AsyncClient, monkeypatch):
    monkeypatch.delenv("NELVYON_JOBS_DATABASE_URL", raising=False)
    ev = _evento("evt_sin_jobs_url", "customer.subscription.updated", {"id": "s", "status": "active"})
    with patch("stripe.Webhook.construct_event", return_value=ev):
        r = await webhook_client.post(
            RUTA, content=b"{}", headers={"stripe-signature": "t=1,v1=x"}
        )
    assert r.status_code == 200
    assert r.json().get("status") in ("ok", "unhandled")
