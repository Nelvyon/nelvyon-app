"""Lo que el fundador necesita ver a las 19:00, y nada mas.

LA PREGUNTA QUE RESPONDE
------------------------
No «como va el sistema». Cuatro preguntas concretas, en este orden:

    1. ¿Ha producido NELVYON hoy?            trabajo confirmado, por capacidad
    2. ¿Se ha roto algo?                     escalados, incidentes, cola atascada
    3. ¿Hay algo esperando mi decision?      trabajos en `awaiting_approval`
    4. ¿Hay clientes en riesgo?              SLA vencido, onboarding parado, churn

Si las cuatro salen bien, el fundador cierra el portatil. Ese es el producto.

CERO NO ES LO MISMO QUE «NO SE»
-------------------------------
Cada bloque puede devolver `medible: false` con su motivo. Un panel que pinta un
cero cuando en realidad no pudo consultar es peor que uno que no pinta nada: el
cero se lee como «todo tranquilo» y es justo cuando hay que mirar. Ya paso:
`/health/business` informo 0 clientes teniendo 1101 porque consultaba sin
contexto.

NO HAY NINGUN NUMERO CALCULADO A OJO
------------------------------------
Todo sale de una consulta. No hay proyecciones, ni «salud general 87%», ni
puntuaciones compuestas. Un numero agregado con aire de precision invita a
decidir sobre el sin poder revisarlo.

POR QUE VA CON SESION DE BARRIDO
--------------------------------
Es una vista de TODA la empresa: cruza inquilinos por definicion. Con el rol de
la aplicacion, RLS le ocultaria cada fila de cliente y el panel saldria vacio sin
un solo error. Se usa `nelvyon_jobs`, que es el rol declarado para eso, y por eso
mismo ninguna consulta de aqui puede llegar a un cliente: este modulo no sirve
respuestas a inquilinos, solo al fundador.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

logger = logging.getLogger(__name__)


async def _bloque(sesion, nombre: str, sql: str,
                  params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Ejecuta una consulta en su propio punto de guardado.

    En PostgreSQL una sentencia que falla aborta la transaccion entera y todo lo
    que venga despues muere con ella. Sin el `begin_nested`, un bloque roto
    convertiria los demas en «no medibles» — un falso verde en cadena. El mismo
    fallo aparecio en `salud_negocio` y se arregla igual.
    """
    try:
        async with sesion.begin_nested():
            r = await sesion.execute(text(sql), params or {})
            filas = [dict(f) for f in r.mappings().all()]
        return {"medible": True, "filas": filas}
    except Exception as exc:  # noqa: BLE001
        logger.warning("centro_de_control: %s no se pudo medir: %s",
                       nombre, str(exc)[:200])
        return {"medible": False, "motivo": type(exc).__name__, "filas": []}


# ═══════════════════════════════════════════════════════════════════════════
# 1. ¿Ha producido?
# ═══════════════════════════════════════════════════════════════════════════

_SQL_PRODUCCION = """
SELECT j.capacidad,
       count(*) FILTER (WHERE j.terminado_en > now() - interval '24 hours') AS ultimas_24h,
       count(*) FILTER (WHERE j.terminado_en > now() - interval '7 days')   AS ultimos_7d,
       count(*)                                                            AS total,
       max(j.terminado_en)                                                 AS ultimo
  FROM autopilot_jobs j
  JOIN workspaces w ON w.id = j.workspace_id
 WHERE j.estado = 'confirmed' AND {filtro}
 GROUP BY j.capacidad
 ORDER BY ultimas_24h DESC, j.capacidad
"""

# El motor puede estar encendido y no producir porque no hay nada que hacer, o
# porque esta roto. Lo que los distingue es si hay trabajo esperando.
_SQL_MOTOR = """
SELECT
  (SELECT count(*) FROM autopilot_workspace_settings s
     JOIN workspaces w ON w.id = s.workspace_id
    WHERE s.habilitado AND {filtro})                              AS workspaces_encendidos,
  (SELECT count(*) FROM autopilot_jobs j JOIN workspaces w ON w.id = j.workspace_id
    WHERE j.estado = 'scheduled' AND {filtro})                    AS en_cola,
  (SELECT count(*) FROM autopilot_jobs j JOIN workspaces w ON w.id = j.workspace_id
    WHERE j.estado = 'running' AND {filtro})                      AS ejecutandose,
  (SELECT count(*) FROM autopilot_jobs j JOIN workspaces w ON w.id = j.workspace_id
    WHERE j.estado = 'scheduled' AND {filtro}
      AND COALESCE(j.proximo_intento, j.programado_para) < now() - interval '1 hour')
                                                                  AS vencidos_sin_tomar
"""


# ═══════════════════════════════════════════════════════════════════════════
# 2. ¿Se ha roto algo?
# ═══════════════════════════════════════════════════════════════════════════

_SQL_ROTO = """
SELECT j.capacidad, j.workspace_id, w.name AS workspace,
       j.intentos, j.ultimo_error, j.actualizado_en
  FROM autopilot_jobs j
  JOIN workspaces w ON w.id = j.workspace_id
 WHERE j.estado = 'escalated' AND {filtro}
 ORDER BY j.actualizado_en DESC
 LIMIT 25
"""

# Los estados de un incidente son `abierto`, `escalado` y `resuelto`, en
# castellano como el resto del modulo de autorrecuperacion. Preguntar por
# 'resolved' habria devuelto SIEMPRE cero incidentes abiertos: el panel diria que
# todo va bien justo cuando hay incidentes sin cerrar.
_SQL_INCIDENTES = """
SELECT metrica, severidad, que_paso, abierto_en, estado, requiere_humano
  FROM business_incidents
 WHERE estado <> 'resuelto'
 ORDER BY abierto_en DESC
 LIMIT 25
"""


# ═══════════════════════════════════════════════════════════════════════════
# 3. ¿Hay algo esperando mi decision?
# ═══════════════════════════════════════════════════════════════════════════
#
# Lo mas importante del panel. Estos trabajos NO se ejecutaran solos nunca: por
# diseno, publican hacia fuera, gastan o son irreversibles. Si nadie los mira,
# se quedan ahi para siempre, y esa es una forma silenciosa de que la empresa
# deje de avanzar.

_SQL_ESPERANDO = """
SELECT j.id, j.capacidad, j.workspace_id, w.name AS workspace,
       c.descripcion, c.reversible, j.creado_en,
       EXTRACT(EPOCH FROM (now() - j.creado_en)) / 86400 AS dias_esperando
  FROM autopilot_jobs j
  JOIN workspaces w ON w.id = j.workspace_id
  LEFT JOIN autopilot_capabilities c ON c.clave = j.capacidad
 WHERE j.estado = 'awaiting_approval' AND {filtro}
 ORDER BY j.creado_en
 LIMIT 50
"""


# ═══════════════════════════════════════════════════════════════════════════
# 4. ¿Hay clientes en riesgo?
# ═══════════════════════════════════════════════════════════════════════════
#
# Se lee del RESULTADO de las capacidades, no repitiendo sus consultas. Si el
# panel calculase el churn por su cuenta, un dia diria algo distinto de lo que
# dice la capacidad y nadie sabria cual manda.

_SQL_RIESGO = """
SELECT DISTINCT ON (j.workspace_id, j.capacidad)
       j.workspace_id, w.name AS workspace, j.capacidad, j.resultado, j.terminado_en
  FROM autopilot_jobs j
  JOIN workspaces w ON w.id = j.workspace_id
 WHERE j.estado = 'confirmed' AND {filtro}
   AND j.capacidad IN ('os_lifecycle.senales_de_churn',
                       'os_lifecycle.onboarding_estancado',
                       'os_helpdesk.sla_en_riesgo')
   AND j.terminado_en > now() - interval '14 days'
 ORDER BY j.workspace_id, j.capacidad, j.terminado_en DESC
"""


def _resumir_riesgo(filas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convierte resultados de capacidades en motivos legibles.

    Solo se incluye un workspace si HAY un motivo. Un panel que lista los 200
    inquilinos con «sin riesgo» al lado no se lee: se cierra.
    """
    import json

    por_ws: dict[int, dict[str, Any]] = {}
    for f in filas:
        res = f.get("resultado")
        if isinstance(res, str):
            try:
                res = json.loads(res)
            except ValueError:
                continue
        if not isinstance(res, dict):
            continue

        entrada = por_ws.setdefault(
            f["workspace_id"],
            {"workspace_id": f["workspace_id"], "workspace": f.get("workspace"),
             "motivos": []})

        cap = f["capacidad"]
        if cap == "os_lifecycle.senales_de_churn":
            entrada["motivos"].extend(res.get("senales") or [])
        elif cap == "os_lifecycle.onboarding_estancado" and res.get("estancado"):
            entrada["motivos"].append(
                f"onboarding parado hace {res.get('dias_sin_avanzar')} dias")
        elif cap == "os_helpdesk.sla_en_riesgo" and res.get("sla_incumplidos"):
            entrada["motivos"].append(
                f"{res['sla_incumplidos']} tickets fuera de SLA")

    return sorted((e for e in por_ws.values() if e["motivos"]),
                  key=lambda e: -len(e["motivos"]))


# ═══════════════════════════════════════════════════════════════════════════
# El panel
# ═══════════════════════════════════════════════════════════════════════════


#: Los dos ambitos posibles, y por que hay dos.
#:
#: `real` es el negocio: excluye los 22 inquilinos `@nelvyon.test`, los
#: workspaces `CERTIFICATION-*` que crean y borran las baterias E2E, y los datos
#: `synthetic` de las primeras versiones. Es lo que el fundador mira, y es el
#: valor por defecto en todas partes.
#:
#: `todo` no excluye nada. Existe unicamente para que la certificacion pueda
#: comprobar el panel sobre los workspaces que ella misma crea, que por
#: definicion son de prueba. La ruta HTTP no lo expone: si lo hiciera, un dia
#: alguien lo usaria para «ver mas» y los KPIs dejarian de significar nada.
AMBITOS = ("real", "todo")


def _filtro(ambito: str) -> str:
    from core.inquilinos_reales import workspace_real

    if ambito not in AMBITOS:
        raise ValueError(f"ambito desconocido: {ambito!r}")
    return "true" if ambito == "todo" else workspace_real("w")


async def componer(sesion, ambito: str = "real") -> dict[str, Any]:
    """Compone el panel entero. Nunca lanza: un panel caido no puede tumbar el API."""
    ahora = datetime.now(timezone.utc)
    filtro = _filtro(ambito)

    def _sql(plantilla: str) -> str:
        return plantilla.replace("{filtro}", filtro)

    produccion = await _bloque(sesion, "produccion", _sql(_SQL_PRODUCCION))
    motor = await _bloque(sesion, "motor", _sql(_SQL_MOTOR))
    roto = await _bloque(sesion, "escalados", _sql(_SQL_ROTO))
    incidentes = await _bloque(sesion, "incidentes", _SQL_INCIDENTES)
    esperando = await _bloque(sesion, "esperando_aprobacion", _sql(_SQL_ESPERANDO))
    riesgo = await _bloque(sesion, "riesgo_de_clientes", _sql(_SQL_RIESGO))

    m = (motor["filas"] or [{}])[0]
    confirmados_24h = sum(int(f.get("ultimas_24h") or 0) for f in produccion["filas"])

    bloques = {
        "produccion": {
            "medible": produccion["medible"],
            "motivo": produccion.get("motivo"),
            "confirmados_24h": confirmados_24h if produccion["medible"] else None,
            "por_capacidad": produccion["filas"],
        },
        "motor": {
            "medible": motor["medible"],
            "motivo": motor.get("motivo"),
            "workspaces_encendidos": m.get("workspaces_encendidos"),
            "en_cola": m.get("en_cola"),
            "ejecutandose": m.get("ejecutandose"),
            "vencidos_sin_tomar": m.get("vencidos_sin_tomar"),
        },
        "roto": {
            "medible": roto["medible"] and incidentes["medible"],
            "trabajos_escalados": roto["filas"],
            "incidentes_abiertos": incidentes["filas"],
        },
        "esperando_decision": {
            "medible": esperando["medible"],
            "motivo": esperando.get("motivo"),
            "total": len(esperando["filas"]) if esperando["medible"] else None,
            "trabajos": esperando["filas"],
        },
        "clientes_en_riesgo": {
            "medible": riesgo["medible"],
            "motivo": riesgo.get("motivo"),
            "workspaces": _resumir_riesgo(riesgo["filas"]),
        },
    }

    return {
        "generado_en": ahora.isoformat(),
        "ambito": ambito,
        "veredicto": _veredicto(bloques),
        "bloques": bloques,
    }


def _veredicto(bloques: dict[str, Any]) -> dict[str, Any]:
    """Una frase que decide si el fundador puede cerrar el portatil.

    El orden importa: «no lo se» gana a «hay un problema», y «hay un problema»
    gana a «todo bien». Un panel que dice «todo bien» porque no pudo mirar es la
    unica salida que no puede permitirse.
    """
    no_medibles = [n for n, b in bloques.items() if not b.get("medible")]
    if no_medibles:
        return {"estado": "desconocido",
                "frase": "Hay bloques que no se han podido medir: "
                         + ", ".join(no_medibles),
                "requiere_atencion": True}

    roto = bloques["roto"]
    problemas = len(roto["trabajos_escalados"]) + len(roto["incidentes_abiertos"])
    atascados = int(bloques["motor"].get("vencidos_sin_tomar") or 0)
    esperando = bloques["esperando_decision"]["total"] or 0
    riesgo = len(bloques["clientes_en_riesgo"]["workspaces"])

    if problemas or atascados:
        partes = []
        if problemas:
            partes.append(f"{problemas} cosas rotas")
        if atascados:
            partes.append(f"{atascados} trabajos atascados en la cola")
        return {"estado": "roto", "frase": "Hay que mirar: " + " y ".join(partes),
                "requiere_atencion": True}

    if esperando or riesgo:
        partes = []
        if esperando:
            partes.append(f"{esperando} decisiones esperando")
        if riesgo:
            partes.append(f"{riesgo} clientes con senales de riesgo")
        return {"estado": "requiere_decision",
                "frase": "Nada roto, pero hay: " + " y ".join(partes),
                "requiere_atencion": True}

    producido = bloques["produccion"]["confirmados_24h"] or 0
    if producido == 0 and (bloques["motor"].get("workspaces_encendidos") or 0) > 0:
        return {"estado": "sin_produccion",
                "frase": "Autopilot esta encendido y no ha confirmado nada en 24 h",
                "requiere_atencion": True}

    return {"estado": "en_marcha",
            "frase": f"{producido} trabajos confirmados en 24 h, nada roto, "
                     "nada esperando decision",
            "requiere_atencion": False}
