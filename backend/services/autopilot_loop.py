"""Los bucles de Autopilot, dentro del API y sin bloquear trafico.

POR QUE AQUI Y NO EN UN SERVICIO PROPIO
---------------------------------------
Un servicio nuevo en Railway es aprovisionamiento y por tanto coste. El API ya
ejecuta cuatro barridos con este patron y su estado vive en PostgreSQL, asi que
sobrevive a reinicios. El bucle vive aqui hasta que haya motivo para moverlo.

TRES RESPONSABILIDADES SEPARADAS
--------------------------------
    planner    descubre que trabajo toca y lo encola
    executor   lo saca de la cola y lo lleva hasta entregado
    vigilante  (ya existia) observa el resultado

Separados a proposito: un planner que tarda no puede frenar la ejecucion, y un
executor atascado no puede impedir que se programe el trabajo de mañana. Cada uno
tiene su intervalo y su propio manejo de fallos.

EL PROBLEMA DEL ESCALADO, Y COMO SE ATAJA
-----------------------------------------
Si mañana alguien pone dos replicas del API, habria dos planners programando lo
mismo. La clave de idempotencia impediria el trabajo duplicado —eso ya esta
probado— pero se pagaria el doble de consultas y el doble de contencion, y el
comportamiento dejaria de ser el certificado.

La solucion no necesita Redis ni infraestructura: `pg_try_advisory_lock` sobre la
propia base. Solo UNA replica obtiene el cerrojo y planifica; las demas lo
intentan, no lo consiguen y esperan al siguiente ciclo sin hacer nada. El cerrojo
se libera solo si el proceso muere, porque va atado a la sesion de PostgreSQL.

Eso convierte «escalar el API» de riesgo silencioso en comportamiento definido: la
replica sobrante no duplica nada, y `estado()` lo refleja para que se vea.

NADA DE BUSY-LOOP
-----------------
`asyncio.sleep` entre ciclos, intervalos configurables por entorno y un semaforo
que limita cuantos trabajos se ejecutan a la vez. El API sigue sirviendo trafico.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

#: Intervalos, configurables sin desplegar.
INTERVALO_PLANNER = int(os.environ.get("NELVYON_AUTOPILOT_PLANNER_SEG", "900"))
INTERVALO_EXECUTOR = int(os.environ.get("NELVYON_AUTOPILOT_EXECUTOR_SEG", "60"))

#: Cuantos trabajos a la vez. Bajo a proposito: comparte proceso con el trafico
#: HTTP, y una rafaga de ejecuciones no puede degradar las respuestas.
CONCURRENCIA = int(os.environ.get("NELVYON_AUTOPILOT_CONCURRENCIA", "2"))

#: Identificadores del cerrojo consultivo. Arbitrarios pero fijos: cambiarlos
#: entre versiones permitiria que dos despliegues distintos planificaran a la vez.
LOCK_PLANNER = 8_412_001

#: Metricas del propio bucle. En memoria a proposito: describen ESTE proceso, y
#: lo que debe sobrevivir al reinicio ya vive en `autopilot_jobs`.
_METRICAS: dict[str, Any] = {
    "planner_ciclos": 0,
    "planner_ultimo": None,
    "planner_ultimo_error": None,
    "planner_con_cerrojo": None,
    "executor_ciclos": 0,
    "executor_ultimo": None,
    "executor_ultimo_error": None,
    "trabajos_confirmados": 0,
    "trabajos_fallidos": 0,
}


def estado() -> dict[str, Any]:
    """Salud de Autopilot, separada de la del API.

    Que el proceso viva no dice nada sobre si Autopilot esta trabajando. Esta
    funcion distingue las dos cosas para que `/health/ready` pueda seguir diciendo
    la verdad sobre el API mientras Autopilot esta degradado.
    """
    ahora = datetime.now(timezone.utc)
    m = dict(_METRICAS)

    def _antiguedad(clave, limite):
        cuando = m.get(clave)
        if cuando is None:
            return "sin ejecutar todavia"
        return "ok" if (ahora - cuando).total_seconds() < limite else "estancado"

    salud = "healthy"
    if m["planner_ultimo_error"] or m["executor_ultimo_error"]:
        salud = "degraded"
    if _antiguedad("planner_ultimo", INTERVALO_PLANNER * 3) == "estancado":
        salud = "stalled"
    if _antiguedad("executor_ultimo", INTERVALO_EXECUTOR * 5) == "estancado":
        salud = "stalled"

    return {
        "status": salud,
        "planner": {
            "ciclos": m["planner_ciclos"],
            "ultimo": m["planner_ultimo"].isoformat() if m["planner_ultimo"] else None,
            "frescura": _antiguedad("planner_ultimo", INTERVALO_PLANNER * 3),
            "con_cerrojo": m["planner_con_cerrojo"],
            "ultimo_error": m["planner_ultimo_error"],
        },
        "executor": {
            "ciclos": m["executor_ciclos"],
            "ultimo": m["executor_ultimo"].isoformat() if m["executor_ultimo"] else None,
            "frescura": _antiguedad("executor_ultimo", INTERVALO_EXECUTOR * 5),
            "confirmados": m["trabajos_confirmados"],
            "fallidos": m["trabajos_fallidos"],
            "ultimo_error": m["executor_ultimo_error"],
        },
        "intervalos": {"planner_seg": INTERVALO_PLANNER,
                       "executor_seg": INTERVALO_EXECUTOR,
                       "concurrencia": CONCURRENCIA},
    }


async def tomar_cerrojo_planner(sesion) -> bool:
    """Solo una replica planifica. Las demas esperan al siguiente ciclo.

    `pg_try_advisory_lock` no espera: devuelve False de inmediato si otro lo
    tiene. El cerrojo se libera solo si la sesion muere, asi que un contenedor
    caido no deja la planificacion bloqueada.
    """
    r = await sesion.execute(
        text("SELECT pg_try_advisory_lock(:k)"), {"k": LOCK_PLANNER})
    return bool(r.scalar())


async def soltar_cerrojo_planner(sesion) -> None:
    await sesion.execute(
        text("SELECT pg_advisory_unlock(:k)"), {"k": LOCK_PLANNER})


async def un_ciclo_planner(sesion) -> dict[str, Any]:
    """Un ciclo. Se expone aparte para poder probarlo sin el bucle."""
    from core.autopilot_ciclo import planear

    if not await tomar_cerrojo_planner(sesion):
        _METRICAS["planner_con_cerrojo"] = False
        logger.info("autopilot planner: otra replica tiene el cerrojo; se omite")
        return {"omitido": True, "motivo": "otra replica planifica"}

    _METRICAS["planner_con_cerrojo"] = True
    try:
        resultado = await planear(sesion)
    finally:
        await soltar_cerrojo_planner(sesion)
        await sesion.commit()
    return resultado


async def un_ciclo_executor(sesion, limite: Optional[int] = None) -> dict[str, Any]:
    """Ejecuta hasta `limite` trabajos. NO necesita cerrojo.

    El reparto ya lo garantiza `FOR UPDATE SKIP LOCKED` en la cola: varios
    executores concurrentes toman trabajos distintos por construccion. Poner un
    cerrojo aqui solo serializaria la ejecucion sin ganar nada.
    """
    from core.autopilot_ciclo import ejecutar_uno

    limite = limite if limite is not None else CONCURRENCIA
    hechos, fallos = 0, 0
    for _ in range(limite):
        salida = await ejecutar_uno(sesion)
        if salida is None:
            break  # cola vacia: no se insiste
        if salida.get("resultado") == "confirmado":
            hechos += 1
        else:
            fallos += 1
    _METRICAS["trabajos_confirmados"] += hechos
    _METRICAS["trabajos_fallidos"] += fallos
    return {"confirmados": hechos, "no_confirmados": fallos}


async def _bucle(nombre: str, intervalo: int, ciclo) -> None:
    """Patron comun. Un fallo nunca tumba el bucle ni el API."""
    from core.database import db_manager, sesion_de_barrido

    while True:
        try:
            await db_manager.ensure_initialized()
            if db_manager.async_session_maker:
                # Barrido cross-tenant, como el vigilante: con la sesion normal
                # RLS ocultaria los workspaces de todos los demas.
                async with await sesion_de_barrido() as sesion:
                    await ciclo(sesion)
                _METRICAS[nombre + "_ciclos"] += 1
                _METRICAS[nombre + "_ultimo"] = datetime.now(timezone.utc)
                _METRICAS[nombre + "_ultimo_error"] = None
        except asyncio.CancelledError:
            logger.info("autopilot %s: detenido", nombre)
            raise
        except Exception as exc:  # noqa: BLE001
            _METRICAS[nombre + "_ultimo_error"] = f"{type(exc).__name__}: {exc}"[:300]
            logger.exception("autopilot %s: ciclo fallido; se reintenta", nombre)
        await asyncio.sleep(intervalo)


def arrancar() -> list[asyncio.Task]:
    """Lanza los dos bucles. Devuelve las tareas para poder pararlas."""
    if os.environ.get("NELVYON_AUTOPILOT_DESACTIVADO") == "1":
        logger.info("autopilot: bucles desactivados por variable de entorno")
        return []

    tareas = [
        asyncio.create_task(_bucle("planner", INTERVALO_PLANNER, un_ciclo_planner)),
        asyncio.create_task(_bucle("executor", INTERVALO_EXECUTOR, un_ciclo_executor)),
    ]
    logger.info("Autopilot arrancado (planner=%ss, executor=%ss, concurrencia=%s)",
                INTERVALO_PLANNER, INTERVALO_EXECUTOR, CONCURRENCIA)
    return tareas


async def detener(tareas: list[asyncio.Task]) -> None:
    """Apagado limpio: se cancela y se espera a que terminen de verdad.

    Sin el `gather`, un trabajo a medias quedaria con su cerrojo puesto hasta que
    caducara. Esperar unos milisegundos aqui evita quince minutos de espera alli.
    """
    for t in tareas:
        t.cancel()
    if tareas:
        await asyncio.gather(*tareas, return_exceptions=True)
    logger.info("Autopilot detenido")
