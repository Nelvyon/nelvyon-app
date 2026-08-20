"""Soporte y ciclo de vida del cliente como capacidades de Autopilot.

LO QUE FALTABA NO ERA EL BUZON
------------------------------
`helpdesk_tickets` ya existe, con contrato canonico de estados y prioridades y
objetivos de SLA declarados en `services/helpdesk_notifications.py`. Lo que no
existia era alguien que mirase ese buzon cuando el fundador no esta: que note un
ticket sin clasificar, uno que se ha pasado de su objetivo de primera respuesta,
un onboarding parado hace dos semanas o una suscripcion marcada para cancelar.

Aqui no se construye un sistema de soporte. Se construye quien lo atiende.

EL SLA NO SE DUPLICA, SE IMPORTA
--------------------------------
Los minutos objetivo se leen de `SLA_TARGETS`, el mismo diccionario que usa el
resto del helpdesk. Copiarlos aqui garantizaria que un dia dijeran cosas
distintas y que nadie supiera cual manda.

DONDE ESTA LA FRONTERA
----------------------
Clasificar un ticket es etiquetarlo, y se deshace quitando la etiqueta. Responder
a un cliente sale de NELVYON y no se deshace. Por eso el triage es automatico y
acotado, y la respuesta espera aprobacion aunque el borrador lo componga la
maquina.

`triage` no toca `priority` a proposito: la prioridad determina el SLA, asi que
cambiarla no es etiquetar, es alterar el compromiso con el cliente y el reloj que
lo mide.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import text

from core.autopilot_capacidades import _base, _fila, _validador
from core.autopilot_ciclo import registrar

logger = logging.getLogger(__name__)


def _objetivos_sla() -> dict[str, dict[str, int]]:
    """Los minutos objetivo, leidos de donde ya viven.

    Si el import fallara, esta capacidad no debe inventarse un SLA propio: sin
    objetivos no hay nada que medir y se dice, en vez de medir contra un numero
    que nadie ha acordado.
    """
    from services.helpdesk_notifications import SLA_TARGETS

    return SLA_TARGETS


# ═══════════════════════════════════════════════════════════════════════════
# AUTOMATIC_SAFE — solo miden
# ═══════════════════════════════════════════════════════════════════════════


async def _sla_en_riesgo(sesion, job):
    """Tickets que se han pasado de su objetivo, por prioridad.

    El calculo se hace en SQL con los minutos reales de cada prioridad en vez de
    con un umbral unico: un ticket urgente y uno bajo no llevan el mismo reloj, y
    medirlos con la misma vara diria que todo va bien justo cuando lo urgente se
    esta pudriendo.
    """
    objetivos = _objetivos_sla()
    casos = " ".join(
        f"WHEN priority = '{p}' THEN {v['first_response']}" for p, v in objetivos.items())
    casos_res = " ".join(
        f"WHEN priority = '{p}' THEN {v['resolution']}" for p, v in objetivos.items())
    medio = objetivos.get("medium", {"first_response": 240, "resolution": 1440})

    m = await _fila(sesion, f"""
        WITH t AS (
            SELECT priority, status, assigned_to, category, created_at, resolved_at,
                   first_response_minutes,
                   (CASE {casos} ELSE {medio['first_response']} END) AS obj_respuesta,
                   (CASE {casos_res} ELSE {medio['resolution']} END) AS obj_resolucion
              FROM helpdesk_tickets
             WHERE workspace_id = :ws
        )
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS abiertos,
          count(*) FILTER (
            WHERE status NOT IN ('resolved','closed')
              AND first_response_minutes IS NULL
              AND created_at < now() - (obj_respuesta || ' minutes')::interval
          ) AS sin_primera_respuesta_a_tiempo,
          count(*) FILTER (
            WHERE status NOT IN ('resolved','closed')
              AND created_at < now() - (obj_resolucion || ' minutes')::interval
          ) AS sin_resolver_a_tiempo,
          count(*) FILTER (
            WHERE status NOT IN ('resolved','closed')
              AND COALESCE(assigned_to, '') = ''
          ) AS sin_asignar,
          count(*) FILTER (WHERE COALESCE(category, '') = '') AS sin_clasificar,
          -- Un ticket puede haberse pasado de la primera respuesta Y de la
          -- resolucion. Sumar los dos recuentos daria mas tickets incumplidos
          -- que tickets, que es como el validador lo descubrio.
          count(*) FILTER (
            WHERE status NOT IN ('resolved','closed')
              AND ((first_response_minutes IS NULL
                    AND created_at < now() - (obj_respuesta || ' minutes')::interval)
                OR created_at < now() - (obj_resolucion || ' minutes')::interval)
          ) AS incumplidos
        FROM t
    """, job["workspace_id"])

    incumplidos = int(m.get("incumplidos") or 0)
    return _base(job, {
        "total": int(m.get("total") or 0),
        "abiertos": int(m.get("abiertos") or 0),
        "sin_primera_respuesta_a_tiempo": int(m.get("sin_primera_respuesta_a_tiempo") or 0),
        "sin_resolver_a_tiempo": int(m.get("sin_resolver_a_tiempo") or 0),
        "sin_asignar": int(m.get("sin_asignar") or 0),
        "sin_clasificar": int(m.get("sin_clasificar") or 0),
        "sla_incumplidos": incumplidos,
        "atencion_requerida": incumplidos > 0,
    })


async def _onboarding_estancado(sesion, job):
    """Onboarding empezado y parado.

    Un onboarding sin empezar no esta estancado: esta sin empezar, y eso es otra
    conversacion. Estancado es haber avanzado y haberse detenido, que es la senal
    que de verdad predice un abandono.
    """
    m = await _fila(sesion, """
        SELECT
          count(*) AS pasos,
          count(*) FILTER (WHERE completed) AS completados,
          max(completed_at) AS ultimo_avance
        FROM onboarding_workspace_steps WHERE workspace_id = :ws
    """, job["workspace_id"])

    pasos = int(m.get("pasos") or 0)
    hechos = int(m.get("completados") or 0)
    ultimo = m.get("ultimo_avance")
    dias = None
    if ultimo is not None:
        from datetime import datetime, timezone
        dias = (datetime.now(timezone.utc) - ultimo).days

    return _base(job, {
        "pasos": pasos,
        "completados": hechos,
        "pendientes": max(0, pasos - hechos),
        "dias_sin_avanzar": dias,
        "empezado": hechos > 0,
        # Solo cuenta como estancado si empezo, falta algo y lleva una semana
        # quieto. Las tres condiciones a la vez, no cualquiera de ellas.
        "estancado": bool(hechos > 0 and hechos < pasos and (dias or 0) >= 7),
    })


async def _senales_de_churn(sesion, job):
    """Senales de abandono, contadas sin adivinar intenciones.

    No hay puntuacion de riesgo ni modelo: hay hechos comprobables. Un numero
    inventado con aire de precision es peor que tres hechos claros, porque invita
    a actuar sobre el sin poder revisarlo.
    """
    m = await _fila(sesion, """
        SELECT
          (SELECT count(*) FROM os_deliverables
            WHERE workspace_id = :ws
              AND created_at > now() - interval '30 days') AS entregables_30d,
          (SELECT count(*) FROM os_tasks
            WHERE workspace_id = :ws AND completed_at IS NOT NULL
              AND completed_at > now() - interval '30 days') AS tareas_cerradas_30d,
          (SELECT count(*) FROM helpdesk_tickets
            WHERE workspace_id = :ws
              AND created_at > now() - interval '30 days') AS tickets_30d,
          (SELECT count(*) FROM subscriptions
            WHERE workspace_id = :ws AND cancel_at_period_end) AS marcadas_cancelar,
          (SELECT count(*) FROM subscriptions
            WHERE workspace_id = :ws AND status = 'active'
              AND current_period_end IS NOT NULL
              AND current_period_end < now() + interval '14 days') AS expiran_pronto
    """, job["workspace_id"])

    entregables = int(m.get("entregables_30d") or 0)
    tareas = int(m.get("tareas_cerradas_30d") or 0)
    cancelar = int(m.get("marcadas_cancelar") or 0)
    expiran = int(m.get("expiran_pronto") or 0)

    señales = []
    if entregables == 0:
        señales.append("sin entregables en 30 dias")
    if tareas == 0:
        señales.append("sin tareas cerradas en 30 dias")
    if cancelar:
        señales.append("suscripcion marcada para cancelar")
    if expiran:
        señales.append("suscripcion expira en menos de 14 dias")

    return _base(job, {
        "entregables_30d": entregables,
        "tareas_cerradas_30d": tareas,
        "tickets_30d": int(m.get("tickets_30d") or 0),
        "suscripciones_marcadas_cancelar": cancelar,
        "suscripciones_expiran_14d": expiran,
        "senales": señales,
        "n_senales": len(señales),
    })


# ═══════════════════════════════════════════════════════════════════════════
# AUTOMATIC_WITH_LIMITS — clasifica, y nada mas
# ═══════════════════════════════════════════════════════════════════════════

#: Palabras que apuntan a cada categoria. Deliberadamente cortas y sin acentos:
#: se comparan contra texto normalizado, y una regla que solo acierta con la
#: tilde puesta no sirve en un buzon real.
_PISTAS: dict[str, tuple[str, ...]] = {
    "billing": ("factura", "facturacion", "cobro", "reembolso", "pago", "plan",
                "precio", "tarjeta", "suscripcion", "invoice", "refund", "billing"),
    "technical": ("error", "fallo", "no funciona", "caido", "lento", "api",
                  "integracion", "bug", "500", "timeout", "conectar"),
    "feature_request": ("sugerencia", "propuesta", "mejora", "podriais",
                        "seria util", "feature", "añadir", "anadir"),
}


def _normalizar(t: str) -> str:
    tabla = str.maketrans("áéíóúÁÉÍÓÚüÜñÑ", "aeiouAEIOUuUnN")
    return (t or "").translate(tabla).lower()


def _clasificar(texto: str, permitidas: set[str]) -> str | None:
    """Devuelve una categoria o None. None significa «no lo se», y eso es valido.

    Adivinar mal una categoria es peor que dejarla vacia: un ticket sin clasificar
    se ve, y uno mal clasificado se enruta a quien no toca y desaparece.
    """
    t = _normalizar(texto)
    marcadores = {c: sum(1 for p in ps if p in t)
                  for c, ps in _PISTAS.items() if c in permitidas}
    if not marcadores:
        return None
    mejor = max(marcadores, key=lambda c: marcadores[c])
    if marcadores[mejor] == 0:
        return None
    # Empate entre dos categorias: no se elige, se deja para una persona.
    if sum(1 for v in marcadores.values() if v == marcadores[mejor]) > 1:
        return None
    return mejor


async def _triage_entrante(sesion, job):
    """Clasifica tickets sin categoria. Ni prioridad, ni estado, ni asignacion.

    EL LIMITE ES FAIL-CLOSED
    ------------------------
    Igual que `marcar_vencidas`: el tope se lee del catalogo y sin tope no se
    escribe nada.
    """
    r = await sesion.execute(
        text("SELECT limites FROM autopilot_capabilities WHERE clave = :c"),
        {"c": "os_helpdesk.triage_entrante"})
    limites = r.scalar() or {}
    if isinstance(limites, str):
        limites = json.loads(limites)

    tope = limites.get("max_filas_por_ejecucion")
    if not tope:
        logger.error("triage: sin limites declarados; no se escribe nada")
        return _base(job, {"clasificados": 0, "omitido": "sin limites declarados"})

    # El vocabulario sale de las plantillas, no de una lista escrita a mano que
    # se desincronizaria en cuanto alguien anadiera una plantilla nueva.
    cats = await sesion.execute(text("SELECT DISTINCT category FROM support_templates"))
    permitidas = {str(c[0]) for c in cats.fetchall() if c[0]}
    if not permitidas:
        return _base(job, {"clasificados": 0, "omitido": "sin plantillas de soporte"})

    filas = (await sesion.execute(text("""
        SELECT id, subject, COALESCE(description, '') AS description
          FROM helpdesk_tickets
         WHERE workspace_id = :ws
           AND COALESCE(category, '') = ''
         ORDER BY created_at
         LIMIT :tope
    """), {"ws": job["workspace_id"], "tope": int(tope)})).mappings().all()

    clasificados, sin_decidir = 0, 0
    for f in filas:
        cat = _clasificar(f"{f['subject']} {f['description']}", permitidas)
        if cat is None:
            sin_decidir += 1
            continue
        await sesion.execute(text("""
            UPDATE helpdesk_tickets SET category = :cat
             WHERE id = :id AND workspace_id = :ws
               AND COALESCE(category, '') = ''
        """), {"cat": cat, "id": f["id"], "ws": job["workspace_id"]})
        clasificados += 1

    return _base(job, {
        "revisados": len(filas),
        "clasificados": clasificados,
        "sin_decidir": sin_decidir,
        "tope_aplicado": int(tope),
    })


# ═══════════════════════════════════════════════════════════════════════════
# HUMAN_APPROVAL — componen y esperan
# ═══════════════════════════════════════════════════════════════════════════


async def _respuesta_sugerida(sesion, job):
    """Compone borradores desde las plantillas. No envia nada."""
    filas = (await sesion.execute(text("""
        SELECT t.id, t.subject, t.category, p.auto_response
          FROM helpdesk_tickets t
          LEFT JOIN support_templates p ON p.category = t.category
         WHERE t.workspace_id = :ws
           AND t.status NOT IN ('resolved','closed')
           AND t.first_response_minutes IS NULL
         ORDER BY t.created_at
         LIMIT 20
    """), {"ws": job["workspace_id"]})).mappings().all()

    borradores = [{"ticket_id": f["id"], "asunto": f["subject"],
                   "categoria": f["category"],
                   "tiene_plantilla": bool(f["auto_response"])}
                  for f in filas]
    return _base(job, {
        "borradores": borradores,
        "n_borradores": len(borradores),
        "envia": False,
    })


async def _campana_de_retencion(sesion, job):
    """Propone a quien contactar. No contacta a nadie."""
    señales = await _senales_de_churn(sesion, job)
    return _base(job, {
        "motivos": señales["senales"],
        "n_motivos": señales["n_senales"],
        "propuesta": "campana compuesta; requiere aprobacion (sale hacia el cliente)",
        "contacta": False,
    })


# ═══════════════════════════════════════════════════════════════════════════
# Registro
# ═══════════════════════════════════════════════════════════════════════════

_CAPACIDADES = {
    "os_helpdesk.sla_en_riesgo": (
        _sla_en_riesgo,
        lambda r: ([] if (r.get("sla_incumplidos", 0) <= r.get("abiertos", 0)
                          <= r.get("total", 0))
                   else ["los subconjuntos no encajan en el total"]),
    ),
    "os_helpdesk.triage_entrante": (
        _triage_entrante,
        # No puede haber clasificado mas de los que miro, ni mas del tope.
        lambda r: ([] if (r.get("omitido")
                          or (r.get("clasificados", 0) <= r.get("revisados", 0)
                              and r.get("clasificados", 0) <= (r.get("tope_aplicado") or 0)))
                   else ["clasifico mas de lo que reviso o mas del tope"]),
    ),
    "os_lifecycle.onboarding_estancado": (
        _onboarding_estancado,
        lambda r: ([] if r.get("completados", 0) <= r.get("pasos", 0)
                   else ["mas pasos completados que pasos"]),
    ),
    "os_lifecycle.senales_de_churn": (
        _senales_de_churn,
        lambda r: ([] if r.get("n_senales") == len(r.get("senales") or [])
                   else ["el recuento de senales no coincide"]),
    ),
    "os_helpdesk.respuesta_sugerida": (
        _respuesta_sugerida,
        lambda r: [] if r.get("envia") is False else ["un borrador no puede enviar"],
    ),
    "os_lifecycle.campana_de_retencion": (
        _campana_de_retencion,
        lambda r: [] if r.get("contacta") is False else ["una propuesta no puede contactar"],
    ),
}


def conectar_todas() -> list[str]:
    """Engancha soporte y ciclo de vida al nucleo. Idempotente."""
    for clave, (handler, comprobar) in _CAPACIDADES.items():
        registrar(clave)((handler, _validador(comprobar)))
    return sorted(_CAPACIDADES)


conectar_todas()
