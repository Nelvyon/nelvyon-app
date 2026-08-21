"""El puente: cada agente automatico se convierte en una capacidad de Autopilot.

POR QUE ESTE FICHERO ES LA PIEZA QUE FALTABA
--------------------------------------------
Un agente que hay que invocar a mano no es autonomia; es una funcion. Lo que
convierte a la plantilla en una empresa que trabaja sola es que el PLANNER
programe su trabajo y el EXECUTOR lo ejecute, cada quince minutos, sin que nadie
pida nada.

Y como el planner y el executor ya estan certificados —idempotencia, reparto con
`FOR UPDATE SKIP LOCKED`, reintentos con backoff, escalado, evidencia obligatoria,
aislamiento por inquilino, vigilante— los agentes heredan todo eso sin escribir
ni una linea mas.

LA DOBLE PUERTA, Y POR QUE NO SOBRA
-----------------------------------
Un trabajo de agente pasa por DOS clasificaciones de riesgo:

    la de Autopilot   decide si el trabajo se ejecuta solo o espera aprobacion
    la del agente     decide si ESA ACCION concreta esta permitida, con que
                      limites y con que presupuesto

Podria parecer redundante. No lo es: la primera gobierna CUANDO se ejecuta algo,
la segunda QUE puede hacer mientras se ejecuta. Un trabajo perfectamente
programable puede contener una accion prohibida, y entonces el agente se para
aunque el trabajo estuviera autorizado a correr.

SOLO SE PUENTEAN LOS AUTOMATICOS
--------------------------------
Los agentes cuya politica exige aprobacion humana NO se registran como
capacidad automatica. Programarlos solo llenaria la cola de trabajos que nadie
puede ejecutar — que es una forma silenciosa de que la empresa se atasque.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text

from core.agentes.runtime import Peticion, ejecutar
from core.autopilot_ciclo import registrar

logger = logging.getLogger(__name__)

#: prefijo de las capacidades de Autopilot que sirve un agente.
PREFIJO = "agente."

#: agente -> accion con la que se le invoca desde la cola. Solo los que la
#: politica declara automaticos; los de aprobacion humana no se programan.
PUENTEADOS: dict[str, str] = {
    "coo.parte_diario": "informe.componer",
    "operaciones.plan_semanal": "plan.componer",
    "sdr.calificar": "pipeline.calificar",
    "onboarding.siguiente_paso": "informe.componer",
    "qa.revisar_entregables": "qa.revisar",
    "soporte.priorizar": "soporte.priorizar",
    "cs.salud_cuenta": "informe.componer",
    "finanzas.parte_de_caja": "informe.componer",
    "sre.parte_de_ejecucion": "informe.componer",
    "seguridad.revision_de_datos": "seguridad.revisar",
}

#: Estados del agente que NO son un fallo del trabajo.
#:
#: Que un agente se detenga porque su politica lo exige, porque no hay
#: presupuesto o porque no hay modelo NO es un error: es el sistema funcionando.
#: Marcarlo como fallo dispararia reintentos con backoff contra algo que no va a
#: cambiar en cinco minutos, y acabaria escalando ruido.
DETENCIONES_LEGITIMAS = frozenset({
    "esperando_aprobacion", "rechazado_por_politica", "sin_presupuesto",
    "sin_modelo", "detenido_por_kill_switch",
})


def _handler_de(agente: str, accion: str):
    async def _handler(sesion, job: dict[str, Any]) -> dict[str, Any]:
        salida = await ejecutar(sesion, Peticion(
            agente=agente, accion=accion,
            workspace_id=int(job["workspace_id"]),
            job_id=int(job["id"]),
            entrada={"periodo": job.get("periodo") or job.get("idempotency_key")},
        ))
        return {
            "workspace_id": int(job["workspace_id"]),
            "agente": agente,
            "accion": accion,
            "estado_agente": salida.get("estado"),
            "agent_run_id": salida.get("run"),
            "confianza": salida.get("confianza"),
            "resultado": salida.get("resultado"),
            "motivo": salida.get("motivo"),
        }
    return _handler


def _validador(resultado: dict[str, Any]) -> dict[str, Any]:
    """El trabajo solo se entrega si el AGENTE entrego.

    Un agente detenido por su politica no es un fallo del trabajo, pero tampoco
    es una entrega: no hay nada que entregar. Se distingue explicitamente para
    que el vigilante no confunda «el sistema se paro bien» con «el sistema
    fallo», que exigen respuestas distintas.
    """
    fallos: list[str] = []
    estado = resultado.get("estado_agente")

    if resultado.get("workspace_id") is None:
        fallos.append("sin workspace")
    if not resultado.get("agent_run_id"):
        fallos.append("sin fila de auditoria: una ejecucion sin rastro no cuenta")
    if estado in DETENCIONES_LEGITIMAS:
        fallos.append(f"el agente se detuvo: {estado} ({resultado.get('motivo')})")
    elif estado != "entregado":
        fallos.append(f"el agente no entrego: {estado}")

    return {"valido": not fallos, "fallos": fallos}


def conectar_todos() -> list[str]:
    """Registra cada agente automatico como capacidad de Autopilot."""
    import core.agentes.plantilla  # noqa: F401  (registra los agentes)

    conectadas = []
    for agente, accion in PUENTEADOS.items():
        clave = PREFIJO + agente
        registrar(clave)((_handler_de(agente, accion), _validador))
        conectadas.append(clave)
    return sorted(conectadas)


async def capacidades_sin_catalogar(sesion) -> list[str]:
    """Capacidades puenteadas que el catalogo de Autopilot no declara.

    Es el fallo que ya tiene su propia alerta en el vigilante: desplegar codigo
    que atiende capacidades que la base no conoce —o al reves— convierte trabajo
    sano en trabajo escalado.
    """
    filas = await sesion.execute(
        text("SELECT clave FROM autopilot_capabilities WHERE clave LIKE :p"),
        {"p": PREFIJO + "%"})
    en_base = {f[0] for f in filas.fetchall()}
    return sorted({PREFIJO + a for a in PUENTEADOS} - en_base)


conectar_todos()
