"""Se rompe cada mecanismo a proposito y se comprueba que reacciona.

POR QUE PRUEBAS DE FALLO Y NO DE CAMINO FELIZ
---------------------------------------------
Un motor de recuperacion que solo se prueba cuando todo va bien no prueba nada:
su unico trabajo es lo que pasa cuando algo se rompe. Aqui se provoca el fallo —se
dejan webhooks colgados, se agotan intentos, se hace fallar la accion— y se mide la
reaccion.

LO QUE MAS IMPORTA SON LOS LIMITES
----------------------------------
La mitad de esta bateria comprueba lo que el motor NO hace: no reintenta dinero,
no borra, no repite acciones no idempotentes, no martillea un servicio caido y no
reintenta para siempre. Un mecanismo automatico sin limites probados es mas
peligroso que no tenerlo, porque actua solo y de madrugada.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest

from core.autorrecuperacion import (
    BACKOFF_MIN,
    ESCALADO,
    FALLOS_PARA_ABRIR,
    MAX_INTENTOS,
    MECANISMOS,
    RESUELTO,
    SOLO_ESCALAR,
    mecanismo_para,
    toca_reintentar,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")


def _dsn_async() -> str:
    return (DSN or "").replace("postgresql://", "postgresql+asyncpg://").replace(
        "@localhost:", "@127.0.0.1:")


@pytest.fixture
async def sesion():
    pytest.importorskip("asyncpg")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    async with maker() as s:
        yield s
    await motor.dispose()


@pytest.fixture
async def limpio(sesion):
    from sqlalchemy import text

    for t in ("business_incidents", "recovery_circuit", "stripe_webhook_events"):
        await sesion.execute(text(f"DELETE FROM {t}"))
    await sesion.commit()
    yield sesion
    for t in ("business_incidents", "recovery_circuit", "stripe_webhook_events"):
        await sesion.execute(text(f"DELETE FROM {t}"))
    await sesion.commit()


# ═══════════════════════════════════════════════════════════════════════════
# 1. Los limites. Se prueban sin base porque son decisiones puras.
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.parametrize("metrica", sorted(SOLO_ESCALAR))
def test_lo_que_toca_dinero_o_aislamiento_nunca_se_repara_solo(metrica):
    """EL LIMITE QUE MAS IMPORTA.

    Un reintento automatico sobre cobros puede cobrar dos veces, y eso no se
    deshace. Una caida de `clientes_visibles` puede ser un fallo de aislamiento:
    «arreglarlo» solo lo taparia. Ambas escalan.
    """
    assert mecanismo_para(metrica) is None, (
        f"{metrica} tiene mecanismo automatico y no deberia: escala siempre"
    )


def test_ningun_mecanismo_borra_ni_cobra():
    """Lectura del SQL de cada accion. Si alguien añade un DELETE o toca importes
    por esta via, esto se pone rojo."""
    import inspect

    prohibido = ("DELETE FROM", "DROP ", "TRUNCATE", "amount", "charge", "refund",
                 "price", "GRANT ", "REVOKE ", "ALTER ROLE")
    for m in MECANISMOS:
        fuente = inspect.getsource(m.accion).upper()
        for palabra in prohibido:
            assert palabra.upper() not in fuente, (
                f"{m.nombre} contiene '{palabra}': un mecanismo automatico no "
                f"puede borrar datos ni tocar dinero, roles o permisos"
            )


def test_el_backoff_es_exponencial_y_finito():
    assert BACKOFF_MIN == sorted(BACKOFF_MIN), "el backoff tiene que crecer"
    assert BACKOFF_MIN[-1] > BACKOFF_MIN[0]
    assert MAX_INTENTOS == len(BACKOFF_MIN)


def test_no_se_reintenta_antes_de_tiempo():
    ahora = datetime.now(timezone.utc)
    assert not toca_reintentar(0, ahora, ahora), "reintento inmediato"
    assert toca_reintentar(0, ahora - timedelta(minutes=2), ahora)


def test_agotados_los_intentos_no_se_reintenta_mas():
    """Sin esto, un fallo permanente daria vueltas para siempre."""
    viejo = datetime.now(timezone.utc) - timedelta(days=1)
    assert not toca_reintentar(MAX_INTENTOS, viejo)


def test_cada_mecanismo_declara_como_verificar():
    """Sin verificacion no hay VERIFICAR: el motor daria por bueno un reintento
    que no arreglo nada."""
    for m in MECANISMOS:
        assert m.verificacion is not None, f"{m.nombre} no sabe comprobar si funciono"
        assert m.descripcion.strip(), f"{m.nombre} no explica que hace"


# ═══════════════════════════════════════════════════════════════════════════
# 2. Fallos reales contra PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════

pg = pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")


@pg
@pytest.mark.asyncio
async def test_webhooks_colgados_se_reencolan_y_el_incidente_se_resuelve(limpio):
    """FALLO PROVOCADO: tres eventos de Stripe que se quedaron en 'processing'
    porque el contenedor murio a media faena. Nadie los retomaria."""
    from sqlalchemy import text

    from core.autorrecuperacion import atender

    s = limpio
    for i in range(3):
        await s.execute(text(
            "INSERT INTO stripe_webhook_events "
            "  (stripe_event_id, event_type, status, received_at) "
            "VALUES (:e, 'checkout.session.completed', 'processing', "
            "        now() - interval '2 hours')"),
            {"e": f"evt_colgado_{i}"})
    await s.commit()

    r = await s.execute(text(
        "INSERT INTO business_incidents "
        "  (clave_dedup, metrica, severidad, que_paso, impacto) "
        "VALUES ('webhooks_stripe_atascados:high', 'webhooks_stripe_atascados', "
        "        'high', 'tres eventos colgados', 'cobros sin aplicar') "
        "RETURNING id"))
    inc_id = int(r.scalar())
    await s.commit()

    incidente = dict((await s.execute(text(
        "SELECT id, metrica, intentos, actualizado_en FROM business_incidents "
        "WHERE id = :id"), {"id": inc_id})).mappings().first())
    # Se envejece para saltarse el backoff del primer intento.
    incidente["actualizado_en"] = datetime.now(timezone.utc) - timedelta(minutes=30)

    resultado = await atender(s, incidente)

    assert resultado["accion"] == "resuelto", resultado
    quedan = (await s.execute(text(
        "SELECT count(*) FROM stripe_webhook_events WHERE status = 'processing'"
    ))).scalar()
    assert quedan == 0, "los eventos siguen colgados"
    estado = (await s.execute(text(
        "SELECT estado FROM business_incidents WHERE id = :id"), {"id": inc_id})).scalar()
    assert estado == RESUELTO


@pg
@pytest.mark.asyncio
async def test_una_anomalia_de_dinero_escala_sin_tocar_nada(limpio):
    """FALLO PROVOCADO: caen las suscripciones activas. El motor NO debe intentar
    arreglarlo: escala y deja el dato intacto."""
    from sqlalchemy import text

    from core.autorrecuperacion import atender

    s = limpio
    r = await s.execute(text(
        "INSERT INTO business_incidents "
        "  (clave_dedup, metrica, severidad, que_paso, impacto) "
        "VALUES ('suscripciones_activas:critical', 'suscripciones_activas', "
        "        'critical', 'cayeron de 40 a 3', 'ingresos perdidos') RETURNING id"))
    inc_id = int(r.scalar())
    await s.commit()

    incidente = {"id": inc_id, "metrica": "suscripciones_activas", "intentos": 0,
                 "actualizado_en": datetime.now(timezone.utc) - timedelta(hours=1)}
    resultado = await atender(s, incidente)

    assert resultado["accion"] == "escalado", resultado
    fila = (await s.execute(text(
        "SELECT estado, requiere_humano FROM business_incidents WHERE id = :id"),
        {"id": inc_id})).first()
    assert fila[0] == ESCALADO and fila[1] is True


@pg
@pytest.mark.asyncio
async def test_agotar_los_intentos_termina_en_escalado(limpio):
    """FALLO PROVOCADO: un incidente que ya consumio todos sus intentos."""
    from sqlalchemy import text

    from core.autorrecuperacion import atender

    s = limpio
    r = await s.execute(text(
        "INSERT INTO business_incidents "
        "  (clave_dedup, metrica, severidad, que_paso, intentos) "
        "VALUES ('webhooks_stripe_atascados:high', 'webhooks_stripe_atascados', "
        "        'high', 'no se arregla', :n) RETURNING id"),
        {"n": MAX_INTENTOS})
    inc_id = int(r.scalar())
    await s.commit()

    resultado = await atender(s, {
        "id": inc_id, "metrica": "webhooks_stripe_atascados",
        "intentos": MAX_INTENTOS,
        "actualizado_en": datetime.now(timezone.utc) - timedelta(hours=2)})

    assert resultado["accion"] == "escalado"
    assert "agotados" in resultado["motivo"]


@pg
@pytest.mark.asyncio
async def test_el_backoff_frena_el_segundo_intento(limpio):
    """Control: recien intentado, el motor espera en vez de repetir."""
    from sqlalchemy import text

    from core.autorrecuperacion import atender

    s = limpio
    r = await s.execute(text(
        "INSERT INTO business_incidents "
        "  (clave_dedup, metrica, severidad, que_paso, intentos) "
        "VALUES ('webhooks_stripe_atascados:high', 'webhooks_stripe_atascados', "
        "        'high', 'recien intentado', 1) RETURNING id"))
    inc_id = int(r.scalar())
    await s.commit()

    resultado = await atender(s, {
        "id": inc_id, "metrica": "webhooks_stripe_atascados", "intentos": 1,
        "actualizado_en": datetime.now(timezone.utc)})
    assert resultado["accion"] == "espera" and resultado["motivo"] == "backoff"


@pg
@pytest.mark.asyncio
async def test_el_interruptor_se_abre_y_deja_de_intentar(limpio):
    """FALLO PROVOCADO: un mecanismo que falla una y otra vez.

    Sin interruptor, el motor martillearia un servicio ya caido cada pasada.
    """
    from sqlalchemy import text

    from core.autorrecuperacion import (
        circuito_abierto,
        registrar_resultado,
    )

    s = limpio
    for _ in range(FALLOS_PARA_ABRIR):
        await registrar_resultado(s, "reencolar_webhooks_atascados", exito=False,
                                  error="dependencia caida")
    await s.commit()

    assert await circuito_abierto(s, "reencolar_webhooks_atascados"), (
        "el interruptor no se abrio tras fallos repetidos")

    # Y un exito lo cierra: la recuperacion vuelve a estar disponible.
    await registrar_resultado(s, "reencolar_webhooks_atascados", exito=True)
    await s.commit()
    assert not await circuito_abierto(s, "reencolar_webhooks_atascados")


@pg
@pytest.mark.asyncio
async def test_el_estado_sobrevive_a_un_reinicio(limpio):
    """El incidente y el interruptor viven en PostgreSQL, no en memoria.

    Se simula el reinicio abriendo una sesion nueva: si el estado estuviera en
    memoria, aqui aparecerian a cero y el motor repetiria trabajo ya hecho.
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from core.autorrecuperacion import circuito_abierto, registrar_resultado

    s = limpio
    await s.execute(text(
        "INSERT INTO business_incidents (clave_dedup, metrica, severidad, que_paso, "
        "intentos) VALUES ('x:high', 'webhooks_stripe_atascados', 'high', 'x', 2)"))
    for _ in range(FALLOS_PARA_ABRIR):
        await registrar_resultado(s, "mecanismo_persistente", exito=False, error="x")
    await s.commit()

    motor = create_async_engine(_dsn_async())
    maker = async_sessionmaker(motor, expire_on_commit=False)
    try:
        async with maker() as otra:
            intentos = (await otra.execute(text(
                "SELECT intentos FROM business_incidents WHERE clave_dedup='x:high'"
            ))).scalar()
            assert intentos == 2, "el incidente no sobrevivio al reinicio"
            assert await circuito_abierto(otra, "mecanismo_persistente"), (
                "el interruptor no sobrevivio al reinicio")
    finally:
        await motor.dispose()


@pg
@pytest.mark.asyncio
async def test_la_misma_anomalia_no_abre_dos_incidentes(limpio):
    """Contra el spam: dos pasadas con la misma anomalia dejan UN incidente."""
    from services.vigilante_negocio import registrar_hallazgos

    s = limpio
    informe = {"findings": [{
        "metric": "webhooks_stripe_atascados", "severity": "high",
        "what_happened": "siete atascados", "evidence": {"actual": 7},
        "impact": "cobros sin aplicar", "needs_human": False,
    }]}
    primeros = await registrar_hallazgos(s, informe)
    segundos = await registrar_hallazgos(s, informe)
    assert primeros == segundos, "la segunda pasada abrio un incidente nuevo"

    from sqlalchemy import text
    n = (await s.execute(text("SELECT count(*) FROM business_incidents"))).scalar()
    assert n == 1


@pg
@pytest.mark.asyncio
async def test_sin_canal_los_avisos_quedan_pendientes_y_no_se_dan_por_hechos(limpio,
                                                                            monkeypatch):
    """EL LIMITE EXTERNO.

    Sin credencial de salida no se puede avisar. Lo inaceptable seria marcarlo como
    notificado igualmente: constaria como avisado algo que nadie ha visto.
    """
    from sqlalchemy import text

    from services.vigilante_negocio import notificar_pendientes

    monkeypatch.delenv("NELVYON_ALERTA_WEBHOOK", raising=False)
    monkeypatch.delenv("NELVYON_ALERTA_EMAIL", raising=False)

    s = limpio
    await s.execute(text(
        "INSERT INTO business_incidents (clave_dedup, metrica, severidad, que_paso) "
        "VALUES ('c:critical', 'suscripciones_activas', 'critical', 'cayo a 0')"))
    await s.commit()

    resultado = await notificar_pendientes(s)
    assert resultado["canal"] is False
    assert resultado["pendientes"] == 1
    assert "BLOCKED_EXTERNALLY" in resultado["motivo"]

    sin_avisar = (await s.execute(text(
        "SELECT notificado_en FROM business_incidents WHERE clave_dedup='c:critical'"
    ))).scalar()
    assert sin_avisar is None, (
        "se marco como notificado sin haber enviado nada: peor que no tener alertas")


@pg
@pytest.mark.asyncio
async def test_con_canal_configurado_el_aviso_sale(limpio, monkeypatch):
    """Control positivo del limite anterior: en cuanto hay canal, se envia.

    Demuestra que lo unico que falta es la credencial, no el mecanismo.
    """
    from sqlalchemy import text

    import core.notificador as notificador
    from services.vigilante_negocio import notificar_pendientes

    enviados: list[dict] = []

    async def _falso_enviar(incidente):
        enviados.append(notificador.componer(incidente))
        return True, ""

    monkeypatch.setattr(notificador, "hay_canal", lambda: True)
    monkeypatch.setattr(notificador, "enviar", _falso_enviar)

    s = limpio
    await s.execute(text(
        "INSERT INTO business_incidents (clave_dedup, metrica, severidad, que_paso, "
        "impacto, requiere_humano) VALUES ('c:critical', 'suscripciones_activas', "
        "'critical', 'cayo a 0', 'ingresos perdidos', true)"))
    await s.commit()

    resultado = await notificar_pendientes(s)
    assert resultado["enviados"] == 1 and resultado["pendientes"] == 0

    aviso = enviados[0]
    for campo in ("severidad", "metrica", "que_paso", "impacto",
                  "accion_automatica", "requiere_humano"):
        assert campo in aviso, f"el aviso no lleva '{campo}'"
    assert aviso["requiere_humano"] is True

    marcado = (await s.execute(text(
        "SELECT notificado_en FROM business_incidents WHERE clave_dedup='c:critical'"
    ))).scalar()
    assert marcado is not None


@pg
@pytest.mark.asyncio
async def test_solo_interrumpe_lo_grave(limpio, monkeypatch):
    """Un incidente MEDIO se registra pero no notifica. Avisar de todo equivale a
    no avisar de nada."""
    from sqlalchemy import text

    import core.notificador as notificador
    from services.vigilante_negocio import notificar_pendientes

    monkeypatch.setattr(notificador, "hay_canal", lambda: True)

    s = limpio
    await s.execute(text(
        "INSERT INTO business_incidents (clave_dedup, metrica, severidad, que_paso) "
        "VALUES ('m:medium', 'onboarding_atascado', 'medium', 'tres atascados')"))
    await s.commit()

    resultado = await notificar_pendientes(s)
    assert resultado["enviados"] == 0 and resultado["pendientes"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# 3. El canal real por SES
# ═══════════════════════════════════════════════════════════════════════════


def test_sin_credenciales_ses_no_se_envia(monkeypatch):
    """Sin las cuatro variables no hay envio posible, y se dice."""
    import core.notificador as n

    for v in ("SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(v, raising=False)
    assert n._ses_configurado() is False


def test_con_las_cuatro_variables_ses_esta_listo(monkeypatch):
    import core.notificador as n

    for v, x in (("SES_ACCESS_KEY_ID", "a"), ("SES_SECRET_ACCESS_KEY", "b"),
                 ("SES_FROM_EMAIL", "c@d.test"), ("SES_REGION", "eu-west-1")):
        monkeypatch.setenv(v, x)
    assert n._ses_configurado() is True


@pytest.mark.asyncio
async def test_un_fallo_de_ses_nunca_devuelve_enviado(monkeypatch):
    """EL LIMITE QUE MAS IMPORTA DEL CANAL.

    Si SES falla y esta funcion devolviera True, el incidente constaria como
    avisado sin que nadie lo haya visto. Eso es peor que no tener alertas.
    """
    import core.notificador as n

    for v, x in (("SES_ACCESS_KEY_ID", "a"), ("SES_SECRET_ACCESS_KEY", "b"),
                 ("SES_FROM_EMAIL", "c@d.test"), ("SES_REGION", "eu-west-1")):
        monkeypatch.setenv(v, x)
    monkeypatch.delenv("NELVYON_ALERTA_WEBHOOK", raising=False)
    monkeypatch.setenv("NELVYON_ALERTA_EMAIL", "destino@nelvyon.test")

    enviado, error = await n.enviar({
        "severidad": "critical", "metrica": "prueba", "que_paso": "x",
        "impacto": "y", "id": 1})
    assert enviado is False, "un fallo de SES se dio por enviado"
    assert error, "un fallo sin causa no se puede diagnosticar"


def test_el_aviso_no_lleva_secretos():
    """Ningun secreto puede acabar en el cuerpo del correo ni en los logs."""
    import core.notificador as n

    cuerpo = n.componer({
        "severidad": "high", "metrica": "m", "que_paso": "q", "impacto": "i",
        "id": 3, "intentos": 1, "estado": "abierto", "requiere_humano": True})
    texto = str(cuerpo).lower()
    for prohibido in ("secret", "access_key", "password", "token", "whsec", "sk_live"):
        assert prohibido not in texto, f"el aviso contiene '{prohibido}'"


def test_el_webhook_manda_sobre_el_correo(monkeypatch):
    """Si hay webhook se usa ese: menos privilegio que enviar correo como NELVYON."""
    import inspect

    import core.notificador as n

    fuente = inspect.getsource(n.enviar)
    assert fuente.index("_webhook()") < fuente.index("_email()")
