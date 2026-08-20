"""El vigilante: cada 15 minutos, sin que nadie lo lance.

POR QUE DENTRO DEL API Y NO EN UN CRON APARTE
---------------------------------------------
Un servicio nuevo en Railway es infraestructura que hay que aprovisionar y pagar.
El API ya ejecuta tres barridos con este mismo patron —planificador social,
informes ejecutivos, reentrenamiento— y sobrevive a reinicios porque su estado
esta en PostgreSQL, no en memoria.

Asi que el vigilante vive aqui: cuesta cero, arranca con el proceso y no depende
del ordenador de nadie ni de una sesion de Claude.

QUE HACE EN CADA PASADA
-----------------------
    revisar salud  ->  abrir/actualizar incidentes  ->  intentar recuperar
                   ->  notificar lo que lo merezca

El orden importa. Se intenta recuperar ANTES de notificar: si el mecanismo
automatico arregla el problema en el primer intento, no hay que despertar a nadie.
Solo se avisa de lo que sobrevive a la recuperacion.

CONTRA EL RUIDO
---------------
Tres filtros, y ninguno sobra:

- deduplicacion: una anomalia que ya tiene incidente abierto no crea otro;
- cooldown de la propia comprobacion, en `salud_negocio`;
- severidad: solo se notifica CRITICAL y HIGH. El resto queda registrado y se
  consulta cuando se quiera, sin interrumpir.

Un sistema que avisa de todo acaba ignorandose entero, y entonces no avisa de nada.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

INTERVALO_SEG = int(os.environ.get("NELVYON_VIGILANTE_INTERVALO", "900"))

#: Severidades que interrumpen. El resto se registra y espera a que se consulte.
NOTIFICABLES = {"critical", "high"}


def clave_dedup(hallazgo: dict[str, Any]) -> str:
    return f"{hallazgo['metric']}:{hallazgo['severity']}"


async def registrar_hallazgos(sesion, informe: dict[str, Any]) -> list[int]:
    """Abre incidentes nuevos y reabre los que vuelven. Devuelve sus ids."""
    ids: list[int] = []
    for h in informe.get("findings", []):
        clave = clave_dedup(h)
        r = await sesion.execute(
            text("SELECT id FROM business_incidents "
                 "WHERE clave_dedup = :k AND estado <> 'resuelto'"),
            {"k": clave})
        existente = r.first()
        if existente:
            # Ya abierto: se refresca la evidencia, no se duplica el incidente.
            await sesion.execute(
                text("UPDATE business_incidents SET evidencia = CAST(:ev AS jsonb), "
                     "que_paso = :q, actualizado_en = now() WHERE id = :id"),
                {"ev": json.dumps(h["evidence"]), "q": h["what_happened"],
                 "id": existente[0]})
            ids.append(int(existente[0]))
            continue

        r = await sesion.execute(
            text("INSERT INTO business_incidents "
                 "  (clave_dedup, metrica, severidad, que_paso, evidencia, impacto, "
                 "   requiere_humano) "
                 "VALUES (:k, :m, :s, :q, CAST(:ev AS jsonb), :i, :rh) RETURNING id"),
            {"k": clave, "m": h["metric"], "s": h["severity"],
             "q": h["what_happened"], "ev": json.dumps(h["evidence"]),
             "i": h["impact"], "rh": bool(h["needs_human"])})
        nuevo = int(r.scalar())
        ids.append(nuevo)
        logger.warning("vigilante: incidente %s abierto — %s", nuevo,
                       h["what_happened"])
    await sesion.commit()
    return ids


async def incidentes_abiertos(sesion) -> list[dict[str, Any]]:
    r = await sesion.execute(text(
        "SELECT id, metrica, severidad, que_paso, evidencia, impacto, estado, "
        "       intentos, actualizado_en, notificado_en, requiere_humano "
        "FROM business_incidents WHERE estado <> 'resuelto' "
        "ORDER BY CASE severidad WHEN 'critical' THEN 0 WHEN 'high' THEN 1 "
        "         ELSE 2 END, abierto_en"))
    return [dict(f) for f in r.mappings().all()]


async def notificar_pendientes(sesion) -> dict[str, Any]:
    """Envia lo que lo merece. Sin canal configurado, lo deja pendiente.

    NO marca como notificado lo que no pudo enviar. Un incidente que se diera por
    avisado sin haberlo enviado seria peor que no tener alertas: daria por cubierto
    algo que nadie ha visto.
    """
    from core.notificador import enviar, hay_canal

    pendientes = [
        i for i in await incidentes_abiertos(sesion)
        if i["notificado_en"] is None and i["severidad"] in NOTIFICABLES
    ]
    if not pendientes:
        return {"enviados": 0, "pendientes": 0, "canal": hay_canal()}

    if not hay_canal():
        logger.error(
            "vigilante: %d incidente(s) de severidad alta SIN CANAL de aviso. "
            "Quedan registrados en business_incidents y sin notificar.",
            len(pendientes))
        return {"enviados": 0, "pendientes": len(pendientes), "canal": False,
                "motivo": "BLOCKED_EXTERNALLY: no hay canal configurado"}

    enviados = 0
    for inc in pendientes:
        ok, error = await enviar(inc)
        if ok:
            await sesion.execute(
                text("UPDATE business_incidents SET notificado_en = now(), "
                     "notificacion_error = NULL WHERE id = :id"),
                {"id": inc["id"]})
            enviados += 1
        else:
            await sesion.execute(
                text("UPDATE business_incidents SET notificacion_error = :e "
                     "WHERE id = :id"),
                {"e": error[:500], "id": inc["id"]})
    await sesion.commit()
    return {"enviados": enviados, "pendientes": len(pendientes) - enviados,
            "canal": True}


async def una_pasada(sesion, ahora: Optional[datetime] = None) -> dict[str, Any]:
    """Un ciclo completo. Se expone aparte para poder probarlo sin el bucle."""
    from core.autorrecuperacion import atender
    from core.salud_negocio import revisar

    ahora = ahora or datetime.now(timezone.utc)
    informe = await revisar(sesion, ahora)
    await registrar_hallazgos(sesion, informe)

    acciones = []
    for inc in await incidentes_abiertos(sesion):
        if inc["estado"] == "escalado":
            continue  # ya escalado: no se vuelve a intentar solo
        acciones.append(await atender(sesion, inc, ahora))

    aviso = await notificar_pendientes(sesion)

    return {
        "salud": informe["status"],
        "peor_severidad": informe["worst_severity"],
        "incidentes_abiertos": len(await incidentes_abiertos(sesion)),
        "acciones": acciones,
        "aviso": aviso,
    }


async def _bucle() -> None:
    from core.database import db_manager

    while True:
        try:
            await db_manager.ensure_initialized()
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as sesion:
                    resultado = await una_pasada(sesion)
                if resultado["salud"] != "ok":
                    logger.warning("vigilante: %s", resultado)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            # Nunca morir: un vigilante que se cae deja de vigilar justo cuando
            # mas falta hace, y su propia caida seria invisible.
            logger.exception("vigilante: pasada fallida; se reintenta al siguiente ciclo")
        await asyncio.sleep(INTERVALO_SEG)


def arrancar() -> Optional[asyncio.Task]:
    """Lanza el vigilante. Devuelve la tarea para poder pararla al apagar."""
    if os.environ.get("NELVYON_VIGILANTE_DESACTIVADO") == "1":
        logger.info("vigilante: desactivado por variable de entorno")
        return None
    tarea = asyncio.create_task(_bucle())
    logger.info("Vigilante de negocio arrancado (intervalo=%ss)", INTERVALO_SEG)
    return tarea
