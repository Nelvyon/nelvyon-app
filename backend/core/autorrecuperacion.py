"""DETECTAR -> CLASIFICAR -> REINTENTAR -> VERIFICAR -> RECUPERAR o ESCALAR.

QUE PROBLEMA RESUELVE
---------------------
Hoy toda recuperacion pasa por una persona. Esta semana hubo cuatro, y las cuatro
las disparo alguien leyendo logs. Mientras el fundador no esta, un job que falla o
un webhook que se atasca se quedan asi.

Este modulo recupera lo REVERSIBLE y escala lo demas. La linea entre las dos cosas
no es una opinion: esta declarada abajo y protegida por pruebas.

LO QUE NUNCA HARA, Y POR QUE
----------------------------
Un mecanismo automatico que se equivoca a las 3 de la mañana no tiene quien lo
pare. Por eso hay operaciones que no se intentan JAMAS por esta via:

  * cobrar, reembolsar o modificar un importe — un reintento mal hecho cobra dos
    veces, y eso no se deshace con un rollback;
  * borrar datos — un borrado automatico no tiene vuelta atras;
  * tocar roles, politicas, secretos, precios o contratos — son decisiones de
    negocio o de seguridad, no incidencias.

Cualquiera de esas se convierte en incidente ESCALADO, con su evidencia, y espera.

COMO EVITA EMPEORAR LAS COSAS
-----------------------------
- IDEMPOTENCIA: cada accion declara si repetirla es seguro. Las que no lo son se
  ejecutan una sola vez y, si falla, se escala.
- BACKOFF EXPONENCIAL: 1, 2, 4, 8 minutos. Un reintento inmediato contra un
  servicio caido solo añade carga.
- MAXIMO DE INTENTOS: agotado el limite se escala. Reintentar para siempre es no
  tener mecanismo.
- INTERRUPTOR: si un mecanismo falla varias veces seguidas, se abre y deja de
  intentarse un rato. Persistido, asi que un reinicio no lo reinicia.
- REGISTRO: toda accion automatica queda escrita en el incidente.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

#: Estados de un incidente.
ABIERTO = "abierto"
RECUPERANDO = "recuperando"
RESUELTO = "resuelto"
ESCALADO = "escalado"

#: Backoff en minutos por numero de intento.
BACKOFF_MIN = [1, 2, 4, 8]
MAX_INTENTOS = len(BACKOFF_MIN)

#: Fallos consecutivos que abren el interruptor, y cuanto permanece abierto.
FALLOS_PARA_ABRIR = 3
INTERRUPTOR_MIN = 15


@dataclass(frozen=True)
class Mecanismo:
    """Una forma de recuperar un tipo de fallo."""

    nombre: str
    #: Metricas de `salud_negocio` que este mecanismo puede atender.
    atiende: tuple[str, ...]
    #: Ejecuta el intento. Recibe la sesion. Devuelve True si hizo algo.
    accion: Callable[[Any], Awaitable[bool]]
    #: Comprueba si el problema quedo resuelto. Sin esto no hay VERIFICAR.
    verificacion: Callable[[Any], Awaitable[bool]]
    #: Si repetir la accion es seguro. Si no, se intenta una sola vez.
    idempotente: bool = True
    descripcion: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Acciones concretas
#
# Todas comparten una regla: tocan ESTADO DE PROCESO, nunca dinero ni datos de
# cliente. Marcar un webhook para reproceso no cobra nada — el procesador de
# Stripe ya es idempotente por `stripe_event_id`, asi que reprocesarlo no puede
# duplicar un cargo. Eso es lo que hace seguro este mecanismo, y por eso esta
# probado aparte.
# ═══════════════════════════════════════════════════════════════════════════


async def _reencolar_webhooks_atascados(sesion) -> bool:
    """Devuelve a 'received' los eventos que llevan mucho en 'processing'.

    Un evento en 'processing' es uno cuyo manejador murio a medias — un reinicio
    del contenedor, por ejemplo. Nadie lo va a retomar: el procesador solo mira
    los 'received'.

    Reprocesarlo NO puede duplicar un cobro: `process_stripe_event` reclama el
    evento por su `stripe_event_id` antes de tocar nada, y si ya estaba procesado
    devuelve 'duplicate'. Esa propiedad es la que hace seguro este reintento.
    """
    r = await sesion.execute(text(
        "UPDATE stripe_webhook_events SET status = 'received' "
        "WHERE status = 'processing' "
        "AND received_at < now() - interval '30 minutes' "
        "AND processed_at IS NULL"
    ))
    return (r.rowcount or 0) > 0


async def _no_quedan_manejadores_muertos(sesion) -> bool:
    """Verifica lo que ESTE mecanismo arregla, ni mas ni menos.

    Un evento viejo en 'processing' es un manejador que murio: nadie lo retomara.
    Eso es lo que la accion limpia, y por tanto lo unico que puede verificar.

    Los que quedan en 'received' NO son un fallo de este mecanismo: significan que
    el evento esta a la espera de que Stripe lo reintente. Devolverlos a ese estado
    es precisamente lo que desbloquea el reintento —mientras estaban en
    'processing', un reintento de Stripe los habria visto como duplicados y no
    habria hecho nada—. Contarlos aqui haria que la verificacion nunca diera por
    resuelto algo que si se arreglo, y el incidente escalaria sin motivo.
    """
    r = await sesion.execute(text(
        "SELECT count(*) FROM stripe_webhook_events "
        "WHERE status = 'processing' "
        "AND received_at < now() - interval '30 minutes' "
        "AND processed_at IS NULL"
    ))
    return int(r.scalar() or 0) == 0


async def _reencolar_jobs_fallidos(sesion) -> bool:
    """Devuelve a la cola los jobs fallidos que aun no agotaron sus intentos.

    No se tocan los que ya llegaron al maximo: esos son un problema real y tienen
    que escalar, no dar vueltas.
    """
    r = await sesion.execute(text(
        "UPDATE automation_jobs SET status = 'pending' "
        "WHERE status = 'failed' "
        "AND COALESCE(attempts, 0) < 3 "
        "AND updated_at < now() - interval '5 minutes'"
    ))
    return (r.rowcount or 0) > 0


async def _no_quedan_jobs_reintentables(sesion) -> bool:
    r = await sesion.execute(text(
        "SELECT count(*) FROM automation_jobs "
        "WHERE status = 'failed' AND COALESCE(attempts, 0) < 3"
    ))
    return int(r.scalar() or 0) == 0


async def _sin_accion(sesion) -> bool:
    """Para anomalias que no tienen recuperacion automatica posible.

    Existe para que el motor pueda decir «lo mire y no hay nada que intentar»
    en vez de callarse. Una anomalia sin mecanismo escala de inmediato.
    """
    return False


async def _nunca_resuelto(sesion) -> bool:
    return False


MECANISMOS: list[Mecanismo] = [
    Mecanismo(
        nombre="reencolar_webhooks_atascados",
        atiende=("webhooks_stripe_atascados",),
        accion=_reencolar_webhooks_atascados,
        verificacion=_no_quedan_manejadores_muertos,
        idempotente=True,
        descripcion="Devuelve a 'received' los eventos cuyo manejador murio a medias",
    ),
    Mecanismo(
        nombre="reencolar_jobs_fallidos",
        atiende=("jobs_fallidos",),
        accion=_reencolar_jobs_fallidos,
        verificacion=_no_quedan_jobs_reintentables,
        idempotente=True,
        descripcion="Reencola jobs fallidos que no agotaron intentos",
    ),
]

#: Metricas que NUNCA se intentan reparar solas. Escalan directamente.
#:
#: No es pereza: son casos donde una accion automatica puede cobrar dos veces,
#: borrar algo o tapar un fallo de aislamiento. La deteccion sirve igual; lo que
#: no puede automatizarse es el arreglo.
SOLO_ESCALAR = {
    "suscripciones_activas",     # dinero
    "webhooks_stripe_con_error",  # dinero, y el error ya agoto reintentos
    "clientes_visibles",          # puede ser un fallo de aislamiento
    "entregables_producidos",
    "proyectos_activos",
    "miembros_activos",
    "onboarding_atascado",
    "tickets_sin_respuesta",
}


def mecanismo_para(metrica: str) -> Optional[Mecanismo]:
    if metrica in SOLO_ESCALAR:
        return None
    for m in MECANISMOS:
        if metrica in m.atiende:
            return m
    return None


# ═══════════════════════════════════════════════════════════════════════════
# Interruptor
# ═══════════════════════════════════════════════════════════════════════════


async def circuito_abierto(sesion, mecanismo: str,
                           ahora: Optional[datetime] = None) -> bool:
    ahora = ahora or datetime.now(timezone.utc)
    r = await sesion.execute(
        text("SELECT abierto_hasta FROM recovery_circuit WHERE mecanismo = :m"),
        {"m": mecanismo})
    fila = r.first()
    return bool(fila and fila[0] and fila[0] > ahora)


async def registrar_resultado(sesion, mecanismo: str, exito: bool,
                              error: str = "") -> None:
    """Actualiza el interruptor. Un exito lo cierra; varios fallos lo abren."""
    if exito:
        await sesion.execute(
            text("INSERT INTO recovery_circuit "
                 "  (mecanismo, fallos_consecutivos, abierto_hasta, ultimo_exito_en) "
                 "VALUES (:m, 0, NULL, now()) "
                 "ON CONFLICT (mecanismo) DO UPDATE SET "
                 "  fallos_consecutivos = 0, abierto_hasta = NULL, "
                 "  ultimo_exito_en = now(), actualizado_en = now()"),
            {"m": mecanismo})
        return

    r = await sesion.execute(
        text("INSERT INTO recovery_circuit (mecanismo, fallos_consecutivos, ultimo_error) "
             "VALUES (:m, 1, :e) "
             "ON CONFLICT (mecanismo) DO UPDATE SET "
             "  fallos_consecutivos = recovery_circuit.fallos_consecutivos + 1, "
             "  ultimo_error = :e, actualizado_en = now() "
             "RETURNING fallos_consecutivos"),
        {"m": mecanismo, "e": error[:500]})
    fallos = int(r.scalar() or 0)
    if fallos >= FALLOS_PARA_ABRIR:
        await sesion.execute(
            text("UPDATE recovery_circuit "
                 "SET abierto_hasta = now() + (:min || ' minutes')::interval "
                 "WHERE mecanismo = :m"),
            {"m": mecanismo, "min": str(INTERRUPTOR_MIN)})
        logger.warning(
            "autorrecuperacion: interruptor ABIERTO para %s tras %d fallos "
            "seguidos; se deja de intentar %d minutos", mecanismo, fallos,
            INTERRUPTOR_MIN)


# ═══════════════════════════════════════════════════════════════════════════
# El ciclo
# ═══════════════════════════════════════════════════════════════════════════


def toca_reintentar(intentos: int, actualizado_en: datetime,
                    ahora: Optional[datetime] = None) -> bool:
    """Backoff exponencial. Funcion pura para poder probarla sin base."""
    ahora = ahora or datetime.now(timezone.utc)
    if intentos >= MAX_INTENTOS:
        return False
    espera = timedelta(minutes=BACKOFF_MIN[intentos])
    return ahora - actualizado_en >= espera


async def atender(sesion, incidente: dict[str, Any],
                  ahora: Optional[datetime] = None) -> dict[str, Any]:
    """Un ciclo sobre un incidente abierto. Devuelve que se hizo y por que."""
    ahora = ahora or datetime.now(timezone.utc)
    metrica = incidente["metrica"]
    intentos = int(incidente["intentos"])

    mecanismo = mecanismo_para(metrica)
    if mecanismo is None:
        return await _escalar(
            sesion, incidente,
            "sin mecanismo de recuperacion automatica para esta anomalia")

    if await circuito_abierto(sesion, mecanismo.nombre, ahora):
        return {"accion": "espera", "motivo": "interruptor abierto",
                "mecanismo": mecanismo.nombre}

    if intentos >= MAX_INTENTOS:
        return await _escalar(
            sesion, incidente,
            f"agotados los {MAX_INTENTOS} intentos de {mecanismo.nombre}")

    if not mecanismo.idempotente and intentos >= 1:
        return await _escalar(
            sesion, incidente,
            f"{mecanismo.nombre} no es idempotente y ya se intento una vez")

    if not toca_reintentar(intentos, incidente["actualizado_en"], ahora):
        return {"accion": "espera", "motivo": "backoff",
                "mecanismo": mecanismo.nombre}

    # ── REINTENTAR ──────────────────────────────────────────────────────
    try:
        hizo_algo = await mecanismo.accion(sesion)
        error = ""
    except Exception as exc:  # noqa: BLE001
        hizo_algo, error = False, f"{type(exc).__name__}: {exc}"[:500]
        logger.warning("autorrecuperacion: %s fallo: %s", mecanismo.nombre, error)

    # ── VERIFICAR ───────────────────────────────────────────────────────
    resuelto = False
    if not error:
        try:
            resuelto = await mecanismo.verificacion(sesion)
        except Exception as exc:  # noqa: BLE001
            error = f"verificacion fallo: {type(exc).__name__}"[:500]

    await registrar_resultado(sesion, mecanismo.nombre, exito=resuelto, error=error)

    accion_txt = (f"{mecanismo.nombre}: "
                  + ("actuo" if hizo_algo else "no habia nada que hacer")
                  + (f"; error={error}" if error else ""))

    if resuelto:
        await sesion.execute(
            text("UPDATE business_incidents SET estado = :e, resuelto_en = now(), "
                 "actualizado_en = now(), intentos = intentos + 1, "
                 "ultima_accion = :a WHERE id = :id"),
            {"e": RESUELTO, "a": accion_txt, "id": incidente["id"]})
        await sesion.commit()
        logger.info("autorrecuperacion: incidente %s RESUELTO por %s",
                    incidente["id"], mecanismo.nombre)
        return {"accion": "resuelto", "mecanismo": mecanismo.nombre,
                "detalle": accion_txt}

    await sesion.execute(
        text("UPDATE business_incidents SET estado = :e, intentos = intentos + 1, "
             "actualizado_en = now(), ultima_accion = :a WHERE id = :id"),
        {"e": RECUPERANDO, "a": accion_txt, "id": incidente["id"]})
    await sesion.commit()
    return {"accion": "reintentado", "mecanismo": mecanismo.nombre,
            "intento": intentos + 1, "detalle": accion_txt}


async def _escalar(sesion, incidente: dict[str, Any], motivo: str) -> dict[str, Any]:
    await sesion.execute(
        text("UPDATE business_incidents SET estado = :e, requiere_humano = true, "
             "actualizado_en = now(), ultima_accion = :a WHERE id = :id"),
        {"e": ESCALADO, "a": f"escalado: {motivo}", "id": incidente["id"]})
    await sesion.commit()
    logger.warning("autorrecuperacion: incidente %s ESCALADO — %s",
                   incidente["id"], motivo)
    return {"accion": "escalado", "motivo": motivo}
