"""El registro de herramientas. Lo unico que un agente puede tocar del mundo.

LA REGLA
--------
Un agente no ejecuta SQL, no llama a APIs y no escribe ficheros. Invoca
HERRAMIENTAS, y solo las que su catalogo le concede. Lo que no esta concedido no
se puede invocar, y el intento queda registrado.

POR QUE ESTO Y NO «que el agente haga consultas»
------------------------------------------------
Porque el dia que un agente componga una consulta a partir de texto que vino de
un cliente —un ticket, un correo, el contenido de una web— esa consulta puede
hacer cualquier cosa. Con herramientas, el agente elige QUE quiere y con QUE
parametros; el SQL lo escribe este fichero, con el `workspace_id` puesto por el
runtime y no por el agente.

Eso convierte la inyeccion de prompt de «puede pasar cualquier cosa» a «puede
pedir una herramienta que no tiene, y se le deniega».

EL WORKSPACE NO LO ELIGE EL AGENTE
----------------------------------
Ninguna herramienta acepta `workspace_id` como parametro. Lo inyecta el runtime
desde el trabajo. Un agente no puede pedir datos de otro inquilino porque no
tiene forma de nombrarlo.

TODAS LEEN
----------
Ninguna herramienta de este registro escribe. Escribir es una ACCION, pasa por
`politicas.decidir` y tiene su propio camino. Separarlo evita el caso mas
peligroso: un agente que, buscando informacion, modifica algo de paso.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from sqlalchemy import text

logger = logging.getLogger(__name__)

#: Tope de filas que devuelve cualquier herramienta. Un contexto ilimitado es un
#: coste ilimitado y una ventana de modelo desbordada; ademas, si un agente
#: necesita mil filas para decidir, el problema es la decision, no el tope.
MAX_FILAS = 50


@dataclass(frozen=True)
class Herramienta:
    """Que hace, que devuelve y por que es segura."""

    nombre: str
    descripcion: str
    fn: Callable[..., Awaitable[Any]]
    #: `True` si solo lee. Hoy TODAS lo son; el campo existe para que anadir una
    #: que escriba sea una decision visible y no un descuido.
    solo_lectura: bool = True


_REGISTRO: dict[str, Herramienta] = {}


def registrar(nombre: str, descripcion: str, solo_lectura: bool = True):
    def envoltorio(fn):
        _REGISTRO[nombre] = Herramienta(nombre, descripcion, fn, solo_lectura)
        return fn
    return envoltorio


def catalogo() -> dict[str, Herramienta]:
    return dict(_REGISTRO)


class HerramientaDenegada(RuntimeError):
    """El agente pidio algo que su catalogo no le concede."""


class HerramientaDesconocida(RuntimeError):
    """El agente pidio algo que no existe. Suele ser una alucinacion."""


async def invocar(sesion, agente: str, permitidas: frozenset[str], nombre: str,
                  workspace_id: int, **kwargs) -> Any:
    """Invoca una herramienta comprobando ANTES que el agente puede.

    `workspace_id` es un parametro de esta funcion y no de la llamada del
    agente: el runtime lo pone, el agente ni lo ve.
    """
    if nombre not in _REGISTRO:
        logger.warning("agente %s pidio una herramienta inexistente: %r",
                       agente, nombre)
        raise HerramientaDesconocida(nombre)
    if nombre not in permitidas:
        logger.error("agente %s intento usar '%s', que no tiene concedida",
                     agente, nombre)
        raise HerramientaDenegada(
            f"'{agente}' no tiene concedida la herramienta '{nombre}'")
    return await _REGISTRO[nombre].fn(sesion, int(workspace_id), **kwargs)


async def _filas(sesion, sql: str, params: dict) -> list[dict]:
    r = await sesion.execute(text(sql), params)
    return [dict(f) for f in r.mappings().all()]


# ═══════════════════════════════════════════════════════════════════════════
# Las herramientas
# ═══════════════════════════════════════════════════════════════════════════


@registrar("clientes.listar", "Clientes del workspace, con su estado.")
async def _clientes(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, business_name, status, created_at
          FROM os_clients WHERE workspace_id = :ws
         ORDER BY created_at DESC LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("proyectos.listar", "Proyectos del workspace y si van con retraso.")
async def _proyectos(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, name, status, due_date,
               (due_date IS NOT NULL AND due_date < now()
                AND archived_at IS NULL) AS retrasado
          FROM os_projects WHERE workspace_id = :ws
         ORDER BY due_date NULLS LAST LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("tareas.pendientes", "Tareas abiertas, vencidas primero.")
async def _tareas(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, title, status, due_date, assignee,
               (due_date IS NOT NULL AND due_date < now()) AS vencida
          FROM os_tasks
         WHERE workspace_id = :ws AND completed_at IS NULL AND archived_at IS NULL
         ORDER BY due_date NULLS LAST LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("entregables.listar", "Entregables y su estado de revision.")
async def _entregables(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, title, type, status, delivered_at, client_reviewed_at,
               (file_url IS NOT NULL AND file_url <> '') AS tiene_artefacto
          FROM os_deliverables WHERE workspace_id = :ws
         ORDER BY created_at DESC LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("tickets.abiertos", "Tickets de soporte sin resolver.")
async def _tickets(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, subject, status, priority, category, created_at,
               first_response_minutes
          FROM helpdesk_tickets
         WHERE workspace_id = :ws AND status NOT IN ('resolved','closed')
         ORDER BY created_at LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("oportunidades.listar", "Pipeline comercial del workspace.")
async def _oportunidades(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT id, title, status, estimated_value, created_at
          FROM os_deals WHERE workspace_id = :ws
         ORDER BY estimated_value DESC NULLS LAST LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})


@registrar("finanzas.resumen", "Entradas, salidas y gastos sin pagar.")
async def _finanzas(sesion, workspace_id: int):
    filas = await _filas(sesion, """
        SELECT
          (SELECT COALESCE(SUM(amount),0) FROM os_cashflow
            WHERE workspace_id = :ws AND direction = 'in') AS entradas,
          (SELECT COALESCE(SUM(amount),0) FROM os_cashflow
            WHERE workspace_id = :ws AND direction = 'out') AS salidas,
          (SELECT count(*) FROM os_expenses
            WHERE workspace_id = :ws AND COALESCE(paid_at,'') = '') AS gastos_sin_pagar
    """, {"ws": workspace_id})
    return filas[0] if filas else {}


@registrar("suscripcion.estado", "Plan contratado y si esta por vencer.")
async def _suscripcion(sesion, workspace_id: int):
    filas = await _filas(sesion, """
        SELECT plan_id, status, current_period_end, cancel_at_period_end
          FROM subscriptions WHERE workspace_id = :ws
         ORDER BY created_at DESC LIMIT 1
    """, {"ws": workspace_id})
    return filas[0] if filas else {}


@registrar("memoria.leer", "Lo que NELVYON ya sabe de este workspace.")
async def _memoria(sesion, workspace_id: int, ambito: str = ""):
    sql = ("SELECT ambito, clave, valor, origen, confianza FROM agent_memory "
           " WHERE workspace_id = :ws AND (vence_en IS NULL OR vence_en > now())")
    params: dict[str, Any] = {"ws": workspace_id}
    if ambito:
        sql += " AND ambito = :am"
        params["am"] = str(ambito)
    sql += " ORDER BY actualizado_en DESC LIMIT :n"
    params["n"] = MAX_FILAS
    return await _filas(sesion, sql, params)


@registrar("autopilot.historial", "Que ha hecho Autopilot en este workspace.")
async def _historial(sesion, workspace_id: int, limite: int = 20):
    return await _filas(sesion, """
        SELECT capacidad, estado, terminado_en
          FROM autopilot_jobs WHERE workspace_id = :ws
         ORDER BY creado_en DESC LIMIT :n
    """, {"ws": workspace_id, "n": min(int(limite), MAX_FILAS)})
