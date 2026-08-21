"""Los agentes de NELVYON, por departamento.

POR QUE CASI TODOS SON DETERMINISTAS
------------------------------------
Porque el trabajo que hace falta para operar una empresa cuando no hay nadie
delante es, en su mayor parte, MIRAR: quien no ha contestado, que se ha pasado
de fecha, que cliente lleva un mes sin recibir nada, que factura no se ha
cobrado. Eso no necesita un modelo de lenguaje. Necesita una consulta correcta y
un umbral acordado.

Meter un modelo donde basta una regla anade coste, latencia, dependencia de un
proveedor y una fuente de errores que no se puede reproducir. Los agentes de
abajo funcionan sin credenciales, sin conexion a ningun proveedor y sin gastar un
centimo — y hacen el 90% del trabajo.

DONDE SI HACE FALTA UN MODELO
-----------------------------
En redactar: un correo a un cliente, una propuesta, una respuesta de soporte. Eso
es generacion de lenguaje de verdad. Esos agentes existen, declaran su nivel de
modelo, y hoy quedan NOT_CONFIGURED porque no hay endpoint configurado. No se
degradan a plantillas fijas que finjan ser redaccion.

Y todos ellos son HUMAN_APPROVAL_REQUIRED de todas formas, porque lo que
producen sale hacia un cliente.

CADA AGENTE DEVUELVE CONFIANZA, Y NO ES DECORATIVA
--------------------------------------------------
Pero no mide lo que parece. Mirar y no encontrar nada es una respuesta COMPLETA,
no una insegura: «no hay tareas que planificar» se sabe con certeza. Lo que si
reduce la confianza de un agente determinista es que los datos vinieran
TRUNCADOS por el tope de filas — entonces sabe que no lo vio todo y que su
respuesta puede estar sesgada. Ver `_confianza`.

Por debajo del umbral de su catalogo, el runtime escala en vez de entregar.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from core.agentes.runtime import Peticion, Resultado, registrar_agente, registrar_evaluador

logger = logging.getLogger(__name__)


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _confianza(*conjuntos: list, tope: int = 50) -> float:
    """Confianza de un agente determinista, y de que depende de verdad.

    LA PRIMERA VERSION DE ESTO ESTABA MAL
    -------------------------------------
    Devolvia 0.30 cuando el agente no habia visto ninguna fila, confundiendo dos
    cosas que no se parecen en nada:

        «mire y no habia nada»   -> es una respuesta COMPLETA. Un plan semanal
                                    sobre cero tareas es «no hay nada que
                                    planificar», y eso se sabe con certeza.
        «no pude mirar»          -> eso si es incertidumbre.

    Un agente determinista que consulta sin error SIEMPRE pudo mirar: si la
    consulta falla, el runtime lo marca `fallo` y no llega aqui. Asi que el
    recuento de filas no dice nada sobre la confianza, y usarlo hacia que los
    agentes escalaran precisamente en los workspaces tranquilos.

    LO QUE SI LA REDUCE
    -------------------
    Que los datos vinieran TRUNCADOS. Las herramientas tienen un tope de filas;
    si un conjunto vuelve justo con ese tope, el agente sabe que hay mas y que su
    respuesta puede estar sesgada — un plan compuesto con 50 de 300 tareas puede
    ordenar mal. Eso es incertidumbre real, medible y accionable.

    Nunca 1.0: los datos pueden estar incompletos por razones que el agente no ve.
    """
    if any(len(c) >= tope for c in conjuntos if c is not None):
        return 0.65
    return 0.95


# ═══════════════════════════════════════════════════════════════════════════
# EVALUADORES — independientes de quien produce
# ═══════════════════════════════════════════════════════════════════════════
#
# Comprueban COHERENCIA INTERNA, no plausibilidad. Un evaluador que se limitara
# a mirar si el resultado «tiene buena pinta» no evaluaria nada: los resultados
# equivocados suelen tenerla.


@registrar_evaluador("eval.estructura")
def _eval_estructura(resultado: dict[str, Any], entrada: dict[str, Any]):
    """Lo minimo exigible a cualquier resultado."""
    fallos = []
    if not isinstance(resultado, dict):
        return {"valido": False, "fallos": ["el resultado no es un objeto"]}
    if not resultado.get("generado_en"):
        fallos.append("sin marca de tiempo")
    if resultado.get("workspace_id") is None:
        fallos.append("sin workspace")
    if "resumen" not in resultado:
        fallos.append("sin resumen legible por una persona")
    return {"valido": not fallos, "fallos": fallos}


@registrar_evaluador("eval.recuentos")
def _eval_recuentos(resultado: dict[str, Any], entrada: dict[str, Any]):
    """Los subconjuntos tienen que caber en sus totales.

    Es la comprobacion que mas defectos reales ha encontrado en este proyecto:
    dos conjuntos solapados sumados como si fueran disjuntos, un filtro que se
    olvida, un recuento que mira otra tabla.
    """
    base = _eval_estructura(resultado, entrada)
    fallos = list(base["fallos"])
    for clave, valor in resultado.items():
        if not clave.startswith("n_") or not isinstance(valor, int):
            continue
        lista = resultado.get(clave[2:])
        if isinstance(lista, list) and valor != len(lista):
            fallos.append(f"{clave}={valor} no coincide con {len(lista)} elementos")
    total = resultado.get("total")
    if isinstance(total, int):
        for clave, valor in resultado.items():
            if clave.startswith("sub_") and isinstance(valor, int) and valor > total:
                fallos.append(f"{clave}={valor} es mayor que el total {total}")
    return {"valido": not fallos, "fallos": fallos}


@registrar_evaluador("eval.no_actua")
def _eval_no_actua(resultado: dict[str, Any], entrada: dict[str, Any]):
    """Para lo que solo PROPONE: comprobar que efectivamente no hizo nada.

    Un agente que prepara un borrador y acaba publicandolo es el fallo mas caro
    posible, asi que se comprueba explicitamente en vez de confiar.
    """
    base = _eval_estructura(resultado, entrada)
    fallos = list(base["fallos"])
    for bandera in ("publica", "envia", "cobra", "contacta", "ejecuta"):
        if resultado.get(bandera) is not False:
            fallos.append(f"'{bandera}' deberia ser explicitamente False")
    return {"valido": not fallos, "fallos": fallos}


# ═══════════════════════════════════════════════════════════════════════════
# DIRECCION / COO
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("coo.parte_diario", evaluador="eval.recuentos")
async def _coo_parte(caja, p: Peticion, limites: dict) -> Resultado:
    """El parte de la empresa: que se movio y que hay que mirar."""
    proyectos = await caja.usar("proyectos.listar", limite=50)
    tareas = await caja.usar("tareas.pendientes", limite=50)
    tickets = await caja.usar("tickets.abiertos", limite=50)
    entregables = await caja.usar("entregables.listar", limite=50)

    retrasados = [x for x in proyectos if x.get("retrasado")]
    vencidas = [x for x in tareas if x.get("vencida")]
    sin_revisar = [x for x in entregables
                   if x.get("delivered_at") and not x.get("client_reviewed_at")]

    atencion = []
    if retrasados:
        atencion.append(f"{len(retrasados)} proyectos pasados de fecha")
    if vencidas:
        atencion.append(f"{len(vencidas)} tareas vencidas")
    if tickets:
        atencion.append(f"{len(tickets)} tickets abiertos")
    if sin_revisar:
        atencion.append(f"{len(sin_revisar)} entregas esperando revision del cliente")

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(proyectos) + len(tareas) + len(tickets),
        "sub_proyectos_retrasados": len(retrasados),
        "sub_tareas_vencidas": len(vencidas),
        "sub_tickets_abiertos": len(tickets),
        "puntos_de_atencion": atencion,
        "n_puntos_de_atencion": len(atencion),
        "resumen": ("Sin puntos de atencion" if not atencion
                    else "Hay que mirar: " + "; ".join(atencion)),
    }
    return Resultado(datos, _confianza(proyectos, tareas, tickets, entregables))


# ═══════════════════════════════════════════════════════════════════════════
# OPERACIONES
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("operaciones.plan_semanal", evaluador="eval.recuentos")
async def _ops_plan(caja, p: Peticion, limites: dict) -> Resultado:
    """Que hay que hacer esta semana, en orden."""
    tareas = await caja.usar("tareas.pendientes", limite=50)
    proyectos = await caja.usar("proyectos.listar", limite=50)

    sin_responsable = [t for t in tareas if not (t.get("assignee") or "").strip()]
    vencidas = [t for t in tareas if t.get("vencida")]
    orden = ([t["title"] for t in vencidas][:10]
             + [t["title"] for t in tareas if not t.get("vencida")][:10])

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(tareas),
        "sub_vencidas": len(vencidas),
        "sub_sin_responsable": len(sin_responsable),
        "proyectos_activos": len([x for x in proyectos
                                  if x.get("status") == "active"]),
        "orden_sugerido": orden,
        "n_orden_sugerido": len(orden),
        "resumen": (f"{len(vencidas)} vencidas primero, luego "
                    f"{max(0, len(tareas) - len(vencidas))} pendientes"),
    }
    return Resultado(datos, _confianza(tareas, proyectos))


# ═══════════════════════════════════════════════════════════════════════════
# CAPTACION / SDR
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("sdr.calificar", evaluador="eval.recuentos")
async def _sdr_calificar(caja, p: Peticion, limites: dict) -> Resultado:
    """Califica el pipeline. NO contacta a nadie: eso es otra accion.

    El criterio es explicito y revisable, no una puntuacion opaca: valor por
    encima del umbral, y sin movimiento reciente. Un numero con aire de
    precision invita a actuar sobre el sin poder discutirlo.
    """
    umbral = int(limites.get("valor_minimo", 0))
    oportunidades = await caja.usar("oportunidades.listar", limite=50)

    calientes = [o for o in oportunidades
                 if float(o.get("estimated_value") or 0) >= umbral
                 and str(o.get("status")) not in ("won", "lost")]
    frias = [o for o in oportunidades if o not in calientes]

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(oportunidades),
        "sub_calificadas": len(calientes),
        "umbral_de_valor": umbral,
        "calificadas": [{"id": o["id"], "titulo": o.get("title"),
                         "valor": float(o.get("estimated_value") or 0)}
                        for o in calientes[:20]],
        "n_calificadas": len(calientes[:20]),
        "descartadas": len(frias),
        "contacta": False,
        "resumen": (f"{len(calientes)} de {len(oportunidades)} oportunidades "
                    f"superan {umbral}"),
    }
    return Resultado(datos, _confianza(oportunidades))


# ═══════════════════════════════════════════════════════════════════════════
# ONBOARDING
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("onboarding.siguiente_paso", evaluador="eval.estructura")
async def _onboarding(caja, p: Peticion, limites: dict) -> Resultado:
    """Que le falta a este cliente para empezar a recibir valor."""
    clientes = await caja.usar("clientes.listar", limite=20)
    proyectos = await caja.usar("proyectos.listar", limite=20)
    entregables = await caja.usar("entregables.listar", limite=20)

    faltan = []
    if not clientes:
        faltan.append("dar de alta el primer cliente")
    if not proyectos:
        faltan.append("crear el primer proyecto")
    if not entregables:
        faltan.append("producir el primer entregable")

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "clientes": len(clientes),
        "proyectos": len(proyectos),
        "entregables": len(entregables),
        "pasos_pendientes": faltan,
        "n_pasos_pendientes": len(faltan),
        "completo": not faltan,
        "resumen": ("Onboarding completo" if not faltan
                    else "Falta: " + "; ".join(faltan)),
    }
    # Aqui la ausencia de datos ES la respuesta, asi que no baja la confianza.
    return Resultado(datos, 0.95)


# ═══════════════════════════════════════════════════════════════════════════
# QA — el que dice que no
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("qa.revisar_entregables", evaluador="eval.recuentos")
async def _qa(caja, p: Peticion, limites: dict) -> Resultado:
    """Entregables que no deberian haberse entregado.

    «Entregado sin artefacto» no es teorico: produccion tiene 2742 filas asi.
    Marcar algo como entregado porque un proceso termino sin excepcion es
    exactamente el defecto que este agente busca.
    """
    entregables = await caja.usar("entregables.listar", limite=50)

    sin_artefacto = [e for e in entregables
                     if e.get("delivered_at") and not e.get("tiene_artefacto")]
    sin_revisar = [e for e in entregables
                   if e.get("delivered_at") and not e.get("client_reviewed_at")]

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(entregables),
        "sub_entregados_sin_artefacto": len(sin_artefacto),
        "sub_sin_revisar_por_el_cliente": len(sin_revisar),
        "rechazados": [{"id": e["id"], "titulo": e.get("title"),
                        "motivo": "marcado entregado y sin artefacto"}
                       for e in sin_artefacto[:20]],
        "n_rechazados": len(sin_artefacto[:20]),
        "aprobado": not sin_artefacto,
        "resumen": ("Ningun entregable con defectos" if not sin_artefacto
                    else f"{len(sin_artefacto)} entregados sin nada que entregar"),
    }
    return Resultado(datos, _confianza(entregables))


# ═══════════════════════════════════════════════════════════════════════════
# SOPORTE
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("soporte.priorizar", evaluador="eval.recuentos")
async def _soporte(caja, p: Peticion, limites: dict) -> Resultado:
    """Orden de atencion. No responde a nadie: responder sale hacia el cliente."""
    tickets = await caja.usar("tickets.abiertos", limite=50)
    peso = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    ordenados = sorted(tickets, key=lambda t: (peso.get(str(t.get("priority")), 4),
                                               str(t.get("created_at"))))
    sin_respuesta = [t for t in tickets if t.get("first_response_minutes") is None]

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(tickets),
        "sub_sin_primera_respuesta": len(sin_respuesta),
        "orden": [{"id": t["id"], "asunto": t.get("subject"),
                   "prioridad": t.get("priority")} for t in ordenados[:20]],
        "n_orden": len(ordenados[:20]),
        "envia": False,
        "resumen": (f"{len(tickets)} abiertos, {len(sin_respuesta)} sin primera "
                    "respuesta"),
    }
    return Resultado(datos, _confianza(tickets))


# ═══════════════════════════════════════════════════════════════════════════
# CUSTOMER SUCCESS
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("cs.salud_cuenta", evaluador="eval.recuentos")
async def _cs(caja, p: Peticion, limites: dict) -> Resultado:
    """Salud de la cuenta a partir de hechos, no de una puntuacion inventada."""
    entregables = await caja.usar("entregables.listar", limite=50)
    tickets = await caja.usar("tickets.abiertos", limite=50)
    suscripcion = await caja.usar("suscripcion.estado")

    señales = []
    if not entregables:
        señales.append("sin entregables")
    if len(tickets) >= 5:
        señales.append(f"{len(tickets)} tickets abiertos a la vez")
    if suscripcion.get("cancel_at_period_end"):
        señales.append("suscripcion marcada para cancelar")

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(entregables) + len(tickets),
        "plan": suscripcion.get("plan_id"),
        "senales": señales,
        "n_senales": len(señales),
        "en_riesgo": bool(señales),
        "contacta": False,
        "resumen": ("Cuenta sana" if not señales
                    else "Riesgo: " + "; ".join(señales)),
    }
    return Resultado(datos, _confianza(entregables, tickets))


# ═══════════════════════════════════════════════════════════════════════════
# FINANZAS
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("finanzas.parte_de_caja", evaluador="eval.estructura")
async def _finanzas(caja, p: Peticion, limites: dict) -> Resultado:
    """Entradas, salidas y lo que esta sin pagar. No mueve un euro."""
    f = await caja.usar("finanzas.resumen")
    entradas = float(f.get("entradas") or 0)
    salidas = float(f.get("salidas") or 0)

    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "entradas": entradas,
        "salidas": salidas,
        "saldo": round(entradas - salidas, 2),
        "gastos_sin_pagar": int(f.get("gastos_sin_pagar") or 0),
        "cobra": False,
        "resumen": f"Saldo {round(entradas - salidas, 2)}",
    }
    return Resultado(datos, 0.95 if f else 0.40)


# ═══════════════════════════════════════════════════════════════════════════
# SRE / OBSERVABILIDAD
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("sre.parte_de_ejecucion", evaluador="eval.recuentos")
async def _sre(caja, p: Peticion, limites: dict) -> Resultado:
    """Que ha hecho el motor, y que se ha atascado."""
    historial = await caja.usar("autopilot.historial", limite=50)
    por_estado: dict[str, int] = {}
    for h in historial:
        por_estado[str(h.get("estado"))] = por_estado.get(str(h.get("estado")), 0) + 1

    escalados = por_estado.get("escalated", 0)
    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "total": len(historial),
        "sub_escalados": escalados,
        "sub_confirmados": por_estado.get("confirmed", 0),
        "por_estado": por_estado,
        "sano": escalados == 0,
        "resumen": (f"{por_estado.get('confirmed', 0)} confirmados, "
                    f"{escalados} escalados"),
    }
    return Resultado(datos, _confianza(historial))


# ═══════════════════════════════════════════════════════════════════════════
# SEGURIDAD / COMPLIANCE
# ═══════════════════════════════════════════════════════════════════════════


@registrar_agente("seguridad.revision_de_datos", evaluador="eval.estructura")
async def _seguridad(caja, p: Peticion, limites: dict) -> Resultado:
    """Revision de lo que este workspace guarda. No cambia ni un permiso."""
    clientes = await caja.usar("clientes.listar", limite=50)
    memoria = await caja.usar("memoria.leer")

    sin_confianza = [m for m in memoria if m.get("confianza") is None]
    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "clientes": len(clientes),
        "entradas_de_memoria": len(memoria),
        "memoria_sin_confianza_declarada": len(sin_confianza),
        "cambia_permisos": False,
        "resumen": (f"{len(clientes)} clientes, {len(memoria)} entradas de "
                    f"memoria ({len(sin_confianza)} sin confianza declarada)"),
    }
    return Resultado(datos, 0.90)


# ═══════════════════════════════════════════════════════════════════════════
# LOS QUE NECESITAN UN MODELO — hoy NOT_CONFIGURED
# ═══════════════════════════════════════════════════════════════════════════
#
# Redactar es lo unico que de verdad necesita un modelo de lenguaje. Estos
# agentes declaran su nivel en el catalogo y el runtime los detiene en el paso 6
# con estado `sin_modelo` mientras no haya endpoint. NO se degradan a plantillas
# fijas que finjan ser redaccion: un texto generico enviado a un cliente concreto
# hace mas daño que no enviar nada.
#
# Ademas todos son HUMAN_APPROVAL_REQUIRED, porque lo que producen sale fuera.


@registrar_agente("ventas.redactar_propuesta", evaluador="eval.no_actua")
async def _propuesta(caja, p: Peticion, limites: dict) -> Resultado:
    """Redacta una propuesta. NUNCA fija precios: los toma de la entrada.

    Un precio inventado por una maquina se convierte en una obligacion con un
    cliente. Si no viene dado, el agente lo dice y no se lo inventa.
    """
    oportunidades = await caja.usar("oportunidades.listar", limite=10)
    precio = p.entrada.get("precio")
    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "oportunidades_consideradas": len(oportunidades),
        "precio_recibido": precio,
        "precio_inventado": False,
        "publica": False, "envia": False, "cobra": False,
        "contacta": False, "ejecuta": False,
        "resumen": ("Borrador preparado" if precio is not None
                    else "No se redacta: falta el precio y no se inventa"),
    }
    return Resultado(datos, 0.95 if precio is not None else 0.20,
                     modelo=None)


@registrar_agente("soporte.redactar_respuesta", evaluador="eval.no_actua")
async def _respuesta(caja, p: Peticion, limites: dict) -> Resultado:
    """Redacta una respuesta de soporte. No la envia."""
    tickets = await caja.usar("tickets.abiertos", limite=10)
    datos = {
        "workspace_id": caja.workspace_id,
        "generado_en": _ahora(),
        "tickets_considerados": len(tickets),
        "publica": False, "envia": False, "cobra": False,
        "contacta": False, "ejecuta": False,
        "resumen": f"Borrador para {len(tickets)} tickets",
    }
    return Resultado(datos, _confianza(tickets))


def agentes_por_departamento() -> dict[str, list[str]]:
    """Mapa legible del organigrama. Se usa en pruebas y en el panel."""
    from core.agentes.runtime import agentes_conectados

    fuera: dict[str, list[str]] = {}
    for clave in agentes_conectados():
        fuera.setdefault(clave.split(".", 1)[0], []).append(clave)
    return fuera
