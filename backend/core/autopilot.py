"""El nucleo del orquestador. Una sola infraestructura para los 14 servicios.

POR QUE UN NUCLEO Y NO CATORCE SCHEDULERS
-----------------------------------------
NELVYON OS tiene 14 servicios y ninguno tiene disparador automatico. Escribir un
planificador por servicio habria dado catorce sitios donde equivocarse con el
cerrojo, el backoff y la deduplicacion — y este proyecto ya ha visto dos veces el
mismo fallo de concurrencia, en `subscriptions` y en `workspace_members`. Aqui esa
logica esta escrita una vez.

Los 14 servicios NO se tocan. Siguen sirviendo peticiones manuales igual que hoy;
Autopilot es otro consumidor mas.

LA MAQUINA DE ESTADOS
---------------------
    scheduled -> running -> produced -> validated -> delivery_pending
              -> delivered -> confirmed

Y las salidas: `awaiting_approval` cuando la politica lo exige, `failed` mientras
queden intentos, `escalated` cuando se agotan o cuando la capacidad no admite
autonomia, `cancelled` cuando deja de tener sentido.

Terminar un worker NO es entregar. `delivered` exige evidencia verificable, y esa
regla esta ademas en un CHECK de la base: no depende de que este modulo se
comporte.

LO QUE NUNCA HARA
-----------------
Una capacidad irreversible no puede declararse automatica — lo impide un CHECK en
`autopilot_capabilities`. Dinero, credenciales, seguridad, RLS, permisos y
borrados van en `SOLO_ESCALAR` o en un modo de aprobacion, nunca en
`AUTOMATIC_*`.
"""
from __future__ import annotations

import hashlib
import logging
import os
import socket
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

# ── estados ────────────────────────────────────────────────────────────────
PROGRAMADO = "scheduled"
ESPERANDO_APROBACION = "awaiting_approval"
EJECUTANDO = "running"
PRODUCIDO = "produced"
VALIDADO = "validated"
ENTREGA_PENDIENTE = "delivery_pending"
ENTREGADO = "delivered"
CONFIRMADO = "confirmed"
FALLIDO = "failed"
ESCALADO = "escalated"
CANCELADO = "cancelled"

#: Transiciones permitidas. Un salto que no este aqui es un error de programacion,
#: no una variante aceptable — sin esta tabla, cualquier bug podria marcar
#: `delivered` un trabajo que nunca se ejecuto.
TRANSICIONES: dict[str, set[str]] = {
    PROGRAMADO: {EJECUTANDO, ESPERANDO_APROBACION, CANCELADO, ESCALADO},
    ESPERANDO_APROBACION: {PROGRAMADO, CANCELADO, ESCALADO},
    EJECUTANDO: {PRODUCIDO, FALLIDO, ESCALADO},
    PRODUCIDO: {VALIDADO, FALLIDO, ESCALADO},
    VALIDADO: {ENTREGA_PENDIENTE, FALLIDO, ESCALADO},
    ENTREGA_PENDIENTE: {ENTREGADO, FALLIDO, ESCALADO},
    ENTREGADO: {CONFIRMADO, ESCALADO},
    CONFIRMADO: set(),
    FALLIDO: {PROGRAMADO, ESCALADO},
    ESCALADO: set(),
    CANCELADO: set(),
}

#: Modos de ejecucion.
AUTOMATICO = "AUTOMATIC_SAFE"
AUTOMATICO_CON_LIMITES = "AUTOMATIC_WITH_LIMITS"
APROBACION_CLIENTE = "CLIENT_APPROVAL"
APROBACION_HUMANA = "HUMAN_APPROVAL"
SOLO_ESCALAR = "SOLO_ESCALAR"

MODOS_AUTOMATICOS = {AUTOMATICO, AUTOMATICO_CON_LIMITES}

#: Backoff en minutos por intento. Igual que en `autorrecuperacion`: crece y es
#: finito.
BACKOFF_MIN = [2, 5, 15]

#: Cuanto vale un cerrojo. Caduca por TIEMPO, no por proceso: si el contenedor
#: muere a media ejecucion, otro trabajador puede retomar el trabajo. Un cerrojo
#: ligado al pid se quedaria colgado para siempre — es lo que paso con los
#: eventos de Stripe atascados en 'processing'.
CERROJO_MIN = 15


def puede_transicionar(desde: str, hasta: str) -> bool:
    """Funcion pura: se prueba sin base de datos."""
    return hasta in TRANSICIONES.get(desde, set())


def clave_idempotencia(workspace_id: int, capacidad: str, periodo: str) -> str:
    """Identifica un trabajo de forma estable.

    El mismo (workspace, capacidad, periodo) da SIEMPRE la misma clave, asi que
    dos planificaciones concurrentes chocan contra la restriccion unica de la base
    en vez de crear dos trabajos. Se resume para que quepa en un indice sin
    depender de la longitud del nombre de la capacidad.
    """
    crudo = f"{int(workspace_id)}:{capacidad}:{periodo}"
    return hashlib.sha256(crudo.encode()).hexdigest()[:48]


def identidad_trabajador() -> str:
    """Quien tiene el cerrojo. Util para diagnosticar, no para decidir."""
    return f"{socket.gethostname()}:{os.getpid()}"


@dataclass(frozen=True)
class Capacidad:
    clave: str
    servicio_os: str
    modo_ejecucion: str
    reversible: bool
    plan_minimo: str
    cadencia: str
    tiempo_limite_s: int
    max_intentos: int


def decide_autonomia(cap: Capacidad) -> str:
    """Que hacer con un trabajo recien planificado, segun su modo.

    Es la frontera de la autonomia y por eso es una funcion pura y corta: se lee
    entera de un vistazo y se prueba sin montar nada.
    """
    if cap.modo_ejecucion == SOLO_ESCALAR:
        return ESCALADO
    if cap.modo_ejecucion in (APROBACION_CLIENTE, APROBACION_HUMANA):
        return ESPERANDO_APROBACION
    if cap.modo_ejecucion in MODOS_AUTOMATICOS:
        if not cap.reversible:
            # Cinturon ademas del CHECK de la base: si alguna vez entrara una
            # capacidad irreversible marcada como automatica, aqui NO se ejecuta.
            logger.error(
                "autopilot: capacidad %s es irreversible y se declara %s; se escala",
                cap.clave, cap.modo_ejecucion)
            return ESCALADO
        return PROGRAMADO
    logger.error("autopilot: modo desconocido %s en %s",
                 cap.modo_ejecucion, cap.clave)
    return ESCALADO


def toca_reintentar(intentos: int, ultimo: Optional[datetime],
                    ahora: Optional[datetime] = None) -> bool:
    ahora = ahora or datetime.now(timezone.utc)
    if intentos >= len(BACKOFF_MIN):
        return False
    if ultimo is None:
        return True
    return ahora - ultimo >= timedelta(minutes=BACKOFF_MIN[intentos])


# ═══════════════════════════════════════════════════════════════════════════
# Operaciones sobre la cola
# ═══════════════════════════════════════════════════════════════════════════


async def leer_capacidad(sesion, clave: str) -> Optional[Capacidad]:
    r = await sesion.execute(
        text("SELECT clave, servicio_os, modo_ejecucion, reversible, plan_minimo, "
             "       cadencia, tiempo_limite_s, max_intentos "
             "FROM autopilot_capabilities WHERE clave = :c AND habilitada"),
        {"c": clave})
    f = r.mappings().first()
    return Capacidad(**dict(f)) if f else None


async def planificar(sesion, workspace_id: int, capacidad: str, periodo: str,
                     entrada: Optional[dict[str, Any]] = None) -> Optional[int]:
    """Crea un trabajo si no existe ya. Devuelve su id, o None si ya estaba.

    NO comprueba antes si existe: inserta y deja que la restriccion unica decida.
    Un `SELECT` previo no protege de dos planificadores simultaneos —ambos verian
    la cola vacia y ambos insertarian—, y esa leccion ya costo dos incidentes en
    este proyecto.
    """
    import json

    cap = await leer_capacidad(sesion, capacidad)
    if cap is None:
        logger.warning("autopilot: capacidad desconocida o deshabilitada: %s",
                       capacidad)
        return None

    estado = decide_autonomia(cap)
    clave = clave_idempotencia(workspace_id, capacidad, periodo)

    r = await sesion.execute(
        text("INSERT INTO autopilot_jobs "
             "  (workspace_id, capacidad, idempotency_key, estado, entrada) "
             "VALUES (:ws, :cap, :k, :e, CAST(:ent AS jsonb)) "
             "ON CONFLICT (idempotency_key) DO NOTHING "
             "RETURNING id"),
        {"ws": int(workspace_id), "cap": capacidad, "k": clave, "e": estado,
         "ent": json.dumps(entrada or {}, default=str)})
    fila = r.first()
    if fila is None:
        return None
    logger.info("autopilot: trabajo %s planificado (%s, ws=%s, estado=%s)",
                fila[0], capacidad, workspace_id, estado)
    return int(fila[0])


async def tomar_trabajo(sesion, trabajador: Optional[str] = None,
                        ahora: Optional[datetime] = None) -> Optional[dict[str, Any]]:
    """Reclama UN trabajo listo y lo pone en ejecucion. Atomico.

    `FOR UPDATE SKIP LOCKED` es lo que permite varios trabajadores a la vez sin
    que dos tomen el mismo: el segundo salta la fila bloqueada en vez de esperar.

    Se reclaman tambien los que tienen un cerrojo CADUCADO — son trabajos cuyo
    trabajador murio a media faena y que nadie retomaria nunca.
    """
    trabajador = trabajador or identidad_trabajador()
    ahora = ahora or datetime.now(timezone.utc)

    r = await sesion.execute(
        text("""
        WITH elegido AS (
            SELECT j.id
              FROM autopilot_jobs j
             WHERE j.estado = :programado
               AND j.programado_para <= :ahora
               AND (j.proximo_intento IS NULL OR j.proximo_intento <= :ahora)
               AND (j.locked_until IS NULL OR j.locked_until < :ahora)
               AND (j.depende_de IS NULL OR EXISTS (
                     SELECT 1 FROM autopilot_jobs d
                      WHERE d.id = j.depende_de AND d.estado = :confirmado))
             ORDER BY j.prioridad, j.programado_para
             LIMIT 1
               FOR UPDATE SKIP LOCKED
        )
        UPDATE autopilot_jobs j
           SET estado = :ejecutando,
               locked_by = :quien,
               locked_until = :hasta,
               intentos = j.intentos + 1,
               actualizado_en = now()
          FROM elegido
         WHERE j.id = elegido.id
        RETURNING j.id, j.workspace_id, j.capacidad, j.intentos, j.entrada
        """),
        {"programado": PROGRAMADO, "confirmado": CONFIRMADO,
         "ejecutando": EJECUTANDO, "ahora": ahora, "quien": trabajador,
         "hasta": ahora + timedelta(minutes=CERROJO_MIN)})
    f = r.mappings().first()
    return dict(f) if f else None


async def avanzar(sesion, job_id: int, desde: str, hasta: str,
                  **campos: Any) -> bool:
    """Mueve un trabajo de estado. Rechaza transiciones ilegales.

    La comprobacion va tambien en el WHERE: si otro proceso ya lo movio, este
    `UPDATE` no afecta a ninguna fila y devuelve False en vez de pisar el cambio.
    """
    import json

    if not puede_transicionar(desde, hasta):
        logger.error("autopilot: transicion ilegal %s -> %s (job %s)",
                     desde, hasta, job_id)
        return False

    asignaciones = ["estado = :hasta", "actualizado_en = now()"]
    params: dict[str, Any] = {"id": job_id, "desde": desde, "hasta": hasta}

    for nombre in ("resultado", "evidencia", "validacion"):
        if nombre in campos:
            asignaciones.append(f"{nombre} = CAST(:{nombre} AS jsonb)")
            # `default=str` no es prolijidad: sin el, cualquier capacidad que
            # devuelva un tipo nativo de PostgreSQL —UUID, datetime, Decimal—
            # revienta AQUI, en el ultimo paso, DESPUES de haber hecho todo el
            # trabajo. Y revienta con un TypeError que no dice que capacidad fue.
            #
            # Estuvo latente mientras las capacidades devolvieron solo enteros y
            # cadenas. La primera que devolvio una fila de la base tal cual lo
            # descubrio.
            params[nombre] = json.dumps(campos[nombre], default=str)
    if "ultimo_error" in campos:
        asignaciones.append("ultimo_error = :err")
        params["err"] = str(campos["ultimo_error"])[:2000]
    if hasta in (CONFIRMADO, ESCALADO, CANCELADO):
        asignaciones.append("terminado_en = now()")
    if hasta != EJECUTANDO:
        asignaciones.append("locked_by = NULL")
        asignaciones.append("locked_until = NULL")

    r = await sesion.execute(
        text("UPDATE autopilot_jobs SET " + ", ".join(asignaciones)
             + " WHERE id = :id AND estado = :desde"),
        params)
    return (r.rowcount or 0) > 0


async def fallar(sesion, job_id: int, desde: str, error: str,
                 max_intentos: int) -> str:
    """Un fallo: reintenta con backoff, o escala si se agoto.

    Devuelve el estado final para que quien llame sepa que paso sin volver a
    consultar.
    """
    r = await sesion.execute(
        text("SELECT intentos FROM autopilot_jobs WHERE id = :id"), {"id": job_id})
    intentos = int(r.scalar() or 0)

    if intentos >= max_intentos:
        await avanzar(sesion, job_id, desde, ESCALADO, ultimo_error=error)
        logger.warning("autopilot: trabajo %s ESCALADO tras %s intentos: %s",
                       job_id, intentos, error[:200])
        return ESCALADO

    espera = BACKOFF_MIN[min(intentos, len(BACKOFF_MIN) - 1)]
    await sesion.execute(
        text("UPDATE autopilot_jobs "
             "SET estado = :programado, ultimo_error = :err, "
             "    proximo_intento = now() + (:min || ' minutes')::interval, "
             "    locked_by = NULL, locked_until = NULL, actualizado_en = now() "
             "WHERE id = :id AND estado = :desde"),
        {"programado": PROGRAMADO, "err": error[:2000], "min": str(espera),
         "id": job_id, "desde": desde})
    return PROGRAMADO
