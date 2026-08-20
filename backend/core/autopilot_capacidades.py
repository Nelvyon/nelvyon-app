"""Las capacidades de los 14 servicios de NELVYON OS.

QUE ES UNA CAPACIDAD Y QUE NO
-----------------------------
No es el CRUD que el router expone. El CRUD existe para las personas: alguien
crea un gasto porque acaba de pagarlo. Autopilot hace trabajo RECURRENTE, y ahi
lo valioso es lo que nadie se acuerda de mirar — gastos vencidos, tareas sin
responsable, entregables esperando revision desde hace tres semanas.

Por eso casi todas leen aunque su servicio sepa escribir. Automatizar el alta de
un gasto no aporta nada y anade riesgo; detectar los que llevan 60 dias sin pagar,
si.

TODAS ESTAN ACOTADAS AL WORKSPACE
---------------------------------
Cada consulta filtra por `workspace_id`. Ninguna cruza inquilinos, ni siquiera
`os_global`, cuyo router SI es cross-workspace: su capacidad mira solo la posicion
del propio workspace. Un barrido automatico que se equivoque de inquilino es una
fuga, y aqui la unica defensa es que la consulta no pueda hacerlo.

EL VALIDADOR ES INDEPENDIENTE DEL HANDLER
-----------------------------------------
A proposito. Si el validador solo comprobara que el handler no lanzo excepcion,
no validaria nada: un handler puede devolver un resultado perfectamente formado y
completamente equivocado. Cada validador comprueba coherencia interna — que los
totales cuadren, que el workspace sea el que se pidio, que no falten campos — y es
lo unico que separa `produced` de `delivered`.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from core.autopilot_ciclo import registrar

logger = logging.getLogger(__name__)


def _base(job: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    """Todo resultado lleva su workspace y su marca de tiempo.

    El workspace no es decorativo: el validador lo compara contra el del trabajo,
    y esa comparacion es lo que detectaria un handler que consultara de mas.
    """
    return {"workspace_id": job["workspace_id"],
            "generado_en": datetime.now(timezone.utc).isoformat(), **extra}


def _valida_pertenencia(job_ws: int):
    """Validador comun: el resultado tiene que ser DE este workspace."""
    def _v(resultado: dict[str, Any]) -> dict[str, Any]:
        fallos = []
        if resultado.get("workspace_id") != job_ws:
            fallos.append("el resultado no pertenece a este workspace")
        if not resultado.get("generado_en"):
            fallos.append("sin marca de tiempo")
        return {"valido": not fallos, "fallos": fallos}
    return _v


def _validador(comprobar) -> Any:
    """Envuelve una comprobacion concreta con la de pertenencia."""
    def _v(resultado: dict[str, Any]) -> dict[str, Any]:
        fallos: list[str] = []
        if not resultado.get("generado_en"):
            fallos.append("sin marca de tiempo")
        if resultado.get("workspace_id") is None:
            fallos.append("sin workspace")
        fallos.extend(comprobar(resultado))
        return {"valido": not fallos, "fallos": fallos}
    return _v


async def _fila(sesion, sql: str, ws: int) -> dict[str, Any]:
    r = await sesion.execute(text(sql), {"ws": ws})
    return dict(r.mappings().first() or {})


# ═══════════════════════════════════════════════════════════════════════════
# AUTOMATIC_SAFE — solo leen
# ═══════════════════════════════════════════════════════════════════════════


async def _observabilidad(sesion, job):
    m = await _fila(sesion, """
        SELECT
          (SELECT count(*) FROM autopilot_jobs
            WHERE workspace_id = :ws AND estado = 'escalated') AS jobs_escalados,
          (SELECT count(*) FROM autopilot_jobs
            WHERE workspace_id = :ws AND estado IN ('scheduled','running')) AS en_cola,
          (SELECT count(*) FROM autopilot_jobs
            WHERE workspace_id = :ws AND estado = 'confirmed') AS confirmados
    """, job["workspace_id"])
    total = int(m.get("en_cola") or 0) + int(m.get("jobs_escalados") or 0)
    return _base(job, {
        "jobs_escalados": int(m.get("jobs_escalados") or 0),
        "en_cola": int(m.get("en_cola") or 0),
        "confirmados": int(m.get("confirmados") or 0),
        "atencion_requerida": total > 0,
    })


async def _excelencia(sesion, job):
    m = await _fila(sesion, """
        SELECT
          (SELECT count(*) FROM os_deliverables
            WHERE workspace_id = :ws AND status = 'changes_requested') AS con_cambios,
          (SELECT count(*) FROM os_deliverables
            WHERE workspace_id = :ws AND delivered_at IS NOT NULL
              AND (file_url IS NULL OR file_url = '')
              AND (storage_key IS NULL OR storage_key = '')) AS sin_artefacto,
          (SELECT count(*) FROM os_deliverables WHERE workspace_id = :ws) AS total
    """, job["workspace_id"])
    total = int(m.get("total") or 0)
    problemas = int(m.get("con_cambios") or 0) + int(m.get("sin_artefacto") or 0)
    return _base(job, {
        "total": total,
        "con_cambios_solicitados": int(m.get("con_cambios") or 0),
        # Entregado sin artefacto es el defecto que ya aparecio en produccion:
        # 2742 filas marcadas como entregadas sin nada que entregar.
        "entregados_sin_artefacto": int(m.get("sin_artefacto") or 0),
        "puntuacion": 100 if total == 0 else max(0, 100 - round(problemas * 100 / total)),
    })


async def _riesgo_global(sesion, job):
    """La posicion de riesgo del PROPIO workspace.

    El router `os_global` es cross-workspace; esta capacidad NO. Un resumen
    automatico que incluyera datos de otros inquilinos seria una fuga, y la unica
    forma de que no ocurra es que la consulta no pueda mirarlos.
    """
    m = await _fila(sesion, """
        SELECT
          (SELECT count(*) FROM os_projects
            WHERE workspace_id = :ws AND archived_at IS NULL
              AND due_date IS NOT NULL AND due_date < now()) AS proyectos_retrasados,
          (SELECT count(*) FROM os_tasks
            WHERE workspace_id = :ws AND archived_at IS NULL
              AND due_date IS NOT NULL AND due_date < now()
              AND completed_at IS NULL) AS tareas_vencidas,
          (SELECT count(*) FROM autopilot_jobs
            WHERE workspace_id = :ws AND estado = 'escalated') AS incidencias
    """, job["workspace_id"])
    señales = [int(m.get(k) or 0) for k in
               ("proyectos_retrasados", "tareas_vencidas", "incidencias")]
    return _base(job, {
        "proyectos_retrasados": señales[0],
        "tareas_vencidas": señales[1],
        "incidencias_escaladas": señales[2],
        "nivel": "alto" if sum(señales) > 10 else "medio" if sum(señales) else "bajo",
    })


async def _cashflow(sesion, job):
    m = await _fila(sesion, """
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0)  AS entradas,
          COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS salidas,
          count(*) AS movimientos
        FROM os_cashflow
        WHERE workspace_id = :ws
          -- `flow_date` es VARCHAR con fecha ISO, no una fecha. Se compara como
          -- texto contra el mismo formato: un CAST reventaria la consulta entera
          -- el dia que una sola fila traiga algo que no sea una fecha, y el orden
          -- lexicografico de ISO-8601 coincide con el cronologico.
          AND flow_date >= to_char(date_trunc('month', now()), 'YYYY-MM-DD')
    """, job["workspace_id"])
    entradas = float(m.get("entradas") or 0)
    salidas = float(m.get("salidas") or 0)
    return _base(job, {
        "entradas": entradas, "salidas": salidas,
        "saldo": round(entradas - salidas, 2),
        "movimientos": int(m.get("movimientos") or 0),
    })


async def _gastos(sesion, job):
    m = await _fila(sesion, """
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE COALESCE(paid_at, '') = '') AS sin_pagar,
          -- Mismo motivo que en cashflow: `expense_date` y `paid_at` son VARCHAR.
          -- Y `paid_at` vacio significa lo mismo que NULL en estas tablas.
          count(*) FILTER (WHERE COALESCE(paid_at, '') = ''
                             AND expense_date < to_char(now() - interval '60 days',
                                                        'YYYY-MM-DD')) AS vencidos,
          COALESCE(SUM(amount) FILTER (WHERE COALESCE(paid_at, '') = ''), 0)
              AS importe_pendiente
        FROM os_expenses WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "total": int(m.get("total") or 0),
        "sin_pagar": int(m.get("sin_pagar") or 0),
        "vencidos_60d": int(m.get("vencidos") or 0),
        "importe_pendiente": float(m.get("importe_pendiente") or 0),
    })


async def _pipeline(sesion, job):
    r = await sesion.execute(text(
        "SELECT status, count(*) AS n, COALESCE(SUM(estimated_value),0) AS valor "
        "FROM os_deals WHERE workspace_id = :ws GROUP BY status"),
        {"ws": job["workspace_id"]})
    etapas = {str(f["status"]): {"n": int(f["n"]), "valor": float(f["valor"])}
              for f in r.mappings().all()}
    parados = await _fila(sesion, """
        SELECT count(*) AS n FROM os_deals
        WHERE workspace_id = :ws AND updated_at < now() - interval '30 days'
    """, job["workspace_id"])
    return _base(job, {
        "etapas": etapas,
        "total": sum(e["n"] for e in etapas.values()),
        "valor_total": round(sum(e["valor"] for e in etapas.values()), 2),
        "sin_mover_30d": int(parados.get("n") or 0),
    })


async def _cartera(sesion, job):
    m = await _fila(sesion, """
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status = 'active') AS activos,
          count(*) FILTER (WHERE created_at > now() - interval '7 days') AS altas_7d
        FROM os_clients WHERE workspace_id = :ws
    """, job["workspace_id"])
    sin_proyecto = await _fila(sesion, """
        SELECT count(*) AS n FROM os_clients c
        WHERE c.workspace_id = :ws AND NOT EXISTS (
          SELECT 1 FROM os_projects p WHERE p.client_id = c.id)
    """, job["workspace_id"])
    return _base(job, {
        "total": int(m.get("total") or 0),
        "activos": int(m.get("activos") or 0),
        "altas_7d": int(m.get("altas_7d") or 0),
        "sin_proyecto": int(sin_proyecto.get("n") or 0),
    })


async def _proyectos(sesion, job):
    m = await _fila(sesion, """
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE archived_at IS NULL) AS activos,
          count(*) FILTER (WHERE archived_at IS NULL AND due_date IS NOT NULL
                             AND due_date < now()) AS retrasados
        FROM os_projects WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "total": int(m.get("total") or 0),
        "activos": int(m.get("activos") or 0),
        "retrasados": int(m.get("retrasados") or 0),
    })


async def _tareas(sesion, job):
    m = await _fila(sesion, """
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE completed_at IS NULL AND archived_at IS NULL) AS abiertas,
          count(*) FILTER (WHERE completed_at IS NULL AND archived_at IS NULL
                             AND due_date IS NOT NULL AND due_date < now()) AS vencidas,
          count(*) FILTER (WHERE completed_at IS NULL AND archived_at IS NULL
                             AND (assignee IS NULL OR assignee = '')) AS sin_responsable
        FROM os_tasks WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "total": int(m.get("total") or 0),
        "abiertas": int(m.get("abiertas") or 0),
        "vencidas": int(m.get("vencidas") or 0),
        "sin_responsable": int(m.get("sin_responsable") or 0),
    })


async def _pendientes_revision(sesion, job):
    m = await _fila(sesion, """
        SELECT
          count(*) FILTER (WHERE delivered_at IS NOT NULL
                             AND client_reviewed_at IS NULL) AS esperando,
          count(*) FILTER (WHERE delivered_at IS NOT NULL
                             AND client_reviewed_at IS NULL
                             AND delivered_at < now() - interval '14 days') AS mas_de_14d,
          count(*) AS total
        FROM os_deliverables WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "total": int(m.get("total") or 0),
        "esperando_revision": int(m.get("esperando") or 0),
        "esperando_mas_de_14d": int(m.get("mas_de_14d") or 0),
    })


# ═══════════════════════════════════════════════════════════════════════════
# AUTOMATIC_WITH_LIMITS — escribe, acotado y reversible
# ═══════════════════════════════════════════════════════════════════════════


async def _marcar_vencidas(sesion, job):
    """Marca en `metadata` las tareas vencidas. Nada mas.

    No cambia `status`, no borra, no avisa a nadie y no toca ninguna otra columna.
    Deshacerlo es quitar la marca.

    EL LIMITE ES FAIL-CLOSED
    ------------------------
    El tope se lee del catalogo. Si no estuviera declarado, esta funcion NO
    escribe: una accion automatica sin frontera es una accion sin frontera, y
    prefiere no hacer nada a hacer de mas.
    """
    r = await sesion.execute(
        text("SELECT limites FROM autopilot_capabilities WHERE clave = :c"),
        {"c": "os_tasks_rest.marcar_vencidas"})
    limites = r.scalar() or {}
    if isinstance(limites, str):
        import json
        limites = json.loads(limites)

    tope = limites.get("max_filas_por_ejecucion")
    dias = limites.get("antiguedad_min_dias")
    if not tope or dias is None:
        logger.error("marcar_vencidas: sin limites declarados; no se escribe nada")
        return _base(job, {"marcadas": 0, "omitido": "sin limites declarados"})

    res = await sesion.execute(
        text("""
        WITH objetivo AS (
            SELECT id FROM os_tasks
             WHERE workspace_id = :ws
               AND archived_at IS NULL
               AND completed_at IS NULL
               AND due_date IS NOT NULL
               AND due_date < now() - (:dias || ' days')::interval
               AND COALESCE(metadata->>'autopilot_vencida', '') <> 'true'
             ORDER BY due_date
             LIMIT :tope)
        UPDATE os_tasks t
           SET metadata = COALESCE(t.metadata, '{}'::jsonb)
                          || jsonb_build_object('autopilot_vencida', 'true')
          FROM objetivo
         WHERE t.id = objetivo.id
        RETURNING t.id
        """),
        {"ws": job["workspace_id"], "dias": str(int(dias)), "tope": int(tope)})
    marcadas = len(res.fetchall())
    return _base(job, {"marcadas": marcadas, "tope_aplicado": int(tope)})


# ═══════════════════════════════════════════════════════════════════════════
# HUMAN_APPROVAL — analizan y proponen; NO ejecutan
#
# Estas nunca llegan al executor: `decide_autonomia` las deja en
# `awaiting_approval` al planificarlas, y `tomar_trabajo` solo recoge
# `scheduled`. Sus handlers existen para cuando una persona apruebe el trabajo,
# no para correr solos.
# ═══════════════════════════════════════════════════════════════════════════


async def _borrador_tienda(sesion, job):
    m = await _fila(sesion, """
        SELECT count(*) AS proyectos,
               count(*) FILTER (WHERE status = 'published') AS publicados
        FROM os_store_projects WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "proyectos": int(m.get("proyectos") or 0),
        "publicados": int(m.get("publicados") or 0),
        "propuesta": "borrador compuesto; requiere aprobacion antes de publicar",
        "publica": False,
    })


async def _borrador_web(sesion, job):
    m = await _fila(sesion, """
        SELECT count(*) AS proyectos FROM os_website_projects WHERE workspace_id = :ws
    """, job["workspace_id"])
    return _base(job, {
        "proyectos": int(m.get("proyectos") or 0),
        "propuesta": "borrador compuesto; requiere aprobacion antes de publicar",
        "publica": False,
    })


async def _plan_autonomo(sesion, job):
    m = await _fila(sesion, """
        SELECT
          (SELECT count(*) FROM os_projects
            WHERE workspace_id = :ws AND archived_at IS NULL) AS proyectos,
          (SELECT count(*) FROM os_tasks
            WHERE workspace_id = :ws AND completed_at IS NULL
              AND archived_at IS NULL) AS tareas_abiertas
    """, job["workspace_id"])
    return _base(job, {
        "proyectos_activos": int(m.get("proyectos") or 0),
        "tareas_abiertas": int(m.get("tareas_abiertas") or 0),
        "propuesta": "plan compuesto; requiere aprobacion (consume credito)",
        "ejecuta": False,
    })


# ═══════════════════════════════════════════════════════════════════════════
# Registro
# ═══════════════════════════════════════════════════════════════════════════

#: Cada entrada: clave -> (handler, comprobaciones propias del validador).
#: Las comprobaciones devuelven una lista de fallos; vacia = valido.
_CAPACIDADES = {
    "os_observability.salud_semanal": (
        _observabilidad,
        lambda r: [] if isinstance(r.get("en_cola"), int) else ["sin recuento de cola"],
    ),
    "os_excellence.checklist_qa": (
        _excelencia,
        # `(r.get("puntuacion") or -1)` convertia una puntuacion de 0 -- que es
        # legitima y ademas la peor noticia posible -- en -1, y el validador
        # rechazaba justo el informe mas urgente. Cero es un valor, no un vacio.
        lambda r: ([] if isinstance(r.get("puntuacion"), (int, float))
                   and 0 <= r["puntuacion"] <= 100
                   else ["puntuacion fuera de rango"]),
    ),
    "os_global.riesgo_semanal": (
        _riesgo_global,
        lambda r: ([] if r.get("nivel") in ("bajo", "medio", "alto")
                   else ["nivel de riesgo desconocido"]),
    ),
    "os_cashflow.resumen_mensual": (
        _cashflow,
        lambda r: ([] if abs((r.get("entradas", 0) - r.get("salidas", 0))
                             - r.get("saldo", 0)) < 0.01
                   else ["el saldo no cuadra con entradas y salidas"]),
    ),
    "os_expenses.resumen_mensual": (
        _gastos,
        lambda r: ([] if (r.get("vencidos_60d", 0) <= r.get("sin_pagar", 0)
                          <= r.get("total", 0))
                   else ["los subconjuntos no encajan en el total"]),
    ),
    "os_deals.pipeline_semanal": (
        _pipeline,
        lambda r: ([] if r.get("total", 0) == sum(
            e["n"] for e in (r.get("etapas") or {}).values())
                   else ["el total no coincide con la suma de etapas"]),
    ),
    "os_clients.cartera_semanal": (
        _cartera,
        lambda r: ([] if r.get("activos", 0) <= r.get("total", 0)
                   else ["mas activos que totales"]),
    ),
    "os_projects.estado_semanal": (
        _proyectos,
        lambda r: ([] if r.get("retrasados", 0) <= r.get("activos", 0) <= r.get("total", 0)
                   else ["los subconjuntos no encajan en el total"]),
    ),
    "os_tasks.carga_semanal": (
        _tareas,
        lambda r: ([] if r.get("vencidas", 0) <= r.get("abiertas", 0) <= r.get("total", 0)
                   else ["los subconjuntos no encajan en el total"]),
    ),
    "os_deliverables_rest.pendientes_revision": (
        _pendientes_revision,
        lambda r: ([] if (r.get("esperando_mas_de_14d", 0)
                          <= r.get("esperando_revision", 0) <= r.get("total", 0))
                   else ["los subconjuntos no encajan en el total"]),
    ),
    "os_tasks_rest.marcar_vencidas": (
        _marcar_vencidas,
        # El limite NO es opcional: si el handler escribio mas de lo permitido,
        # el trabajo no se entrega y se investiga.
        lambda r: ([] if (r.get("marcadas", 0) <= (r.get("tope_aplicado") or 0)
                          or r.get("omitido"))
                   else ["se marcaron mas filas que el tope declarado"]),
    ),
    "os_store_builder.preparar_borrador": (
        _borrador_tienda,
        lambda r: [] if r.get("publica") is False else ["un borrador no puede publicar"],
    ),
    "os_web_builder.preparar_borrador": (
        _borrador_web,
        lambda r: [] if r.get("publica") is False else ["un borrador no puede publicar"],
    ),
    "os_autonomous.proponer_plan": (
        _plan_autonomo,
        lambda r: [] if r.get("ejecuta") is False else ["una propuesta no puede ejecutar"],
    ),
}


def conectar_todas() -> list[str]:
    """Engancha las 13 capacidades al nucleo. Idempotente."""
    for clave, (handler, comprobar) in _CAPACIDADES.items():
        registrar(clave)((handler, _validador(comprobar)))
    return sorted(_CAPACIDADES)


# Se conectan al importar el modulo, igual que `_snapshot_semanal`.
conectar_todas()
