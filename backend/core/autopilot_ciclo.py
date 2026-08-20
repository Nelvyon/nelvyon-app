"""Planner, executor y nacimiento de Autopilot. Las tres piezas que faltaban.

EL NUCLEO NO SE ALIMENTABA SOLO
-------------------------------
`core/autopilot.py` trae la cola, los cerrojos y la maquina de estados, pero nadie
creaba trabajo ni lo ejecutaba. Aqui estan las tres piezas que cierran el ciclo:

    PLANNER      recorre workspaces con Autopilot encendido y programa lo que toca
    EXECUTOR     toma un trabajo, llama al servicio OS, valida y entrega
    PROVISIONING enciende Autopilot con defaults seguros al nacer un workspace

Ninguna toca los 14 servicios de OS: el executor los LLAMA, igual que lo haria una
persona desde la interfaz.

POR QUE EL PLANNER NO CONSULTA EL PLAN EN PYTHON
------------------------------------------------
La condicion «este workspace tiene contratada esta capacidad» junta cuatro cosas:
interruptor general, capacidad encendida, plan suficiente y cadencia cumplida. En
Python serian cuatro consultas por workspace y una ventana donde el estado cambia
entre ellas. En SQL es una sola consulta y una sola foto coherente.

ENTREGAR EXIGE EVIDENCIA
------------------------
El executor no marca `delivered` porque el handler haya devuelto sin excepcion.
Marca `produced`, valida, y solo entrega si la validacion pasa y hay evidencia
verificable. La base lo exige ademas por CHECK.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy import text

from core.autopilot import (
    ENTREGA_PENDIENTE,
    ENTREGADO,
    CONFIRMADO,
    EJECUTANDO,
    PRODUCIDO,
    VALIDADO,
    avanzar,
    fallar,
    leer_capacidad,
    planificar,
    tomar_trabajo,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# PLANNER
# ═══════════════════════════════════════════════════════════════════════════

#: Cadencia -> cuanto dura un periodo. Define tambien la clave de idempotencia:
#: dos planificaciones dentro del mismo periodo producen la misma clave y por
#: tanto un solo trabajo.
def periodo_actual(cadencia: str, ahora: Optional[datetime] = None) -> str:
    ahora = ahora or datetime.now(timezone.utc)
    if cadencia == "daily":
        return ahora.strftime("%Y-%m-%d")
    if cadencia == "weekly":
        iso = ahora.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    if cadencia == "monthly":
        return ahora.strftime("%Y-%m")
    return ahora.strftime("%Y-%m-%d")


#: Una sola consulta: interruptor, capacidad, plan y cadencia a la vez.
_SQL_ELEGIBLES = """
SELECT c.workspace_id,
       c.capacidad,
       cap.cadencia
  FROM autopilot_workspace_capabilities c
  JOIN autopilot_workspace_settings s ON s.workspace_id = c.workspace_id
  JOIN autopilot_capabilities cap     ON cap.clave = c.capacidad
  LEFT JOIN LATERAL (
        SELECT sub.plan_id
          FROM subscriptions sub
         WHERE sub.workspace_id = c.workspace_id
           AND sub.status = 'active'
         ORDER BY sub.id DESC
         LIMIT 1) plan ON true
  LEFT JOIN plan_rango pr_ws  ON pr_ws.plan_id  = COALESCE(plan.plan_id, 'starter')
  LEFT JOIN plan_rango pr_min ON pr_min.plan_id = cap.plan_minimo
 WHERE s.habilitado
   AND c.habilitada
   AND cap.habilitada
   AND COALESCE(pr_ws.rango, 0) >= COALESCE(pr_min.rango, 0)
   -- El workspace tiene que existir Y tener a alguien dentro: programar trabajo
   -- para un workspace huerfano es producir para nadie, que es exactamente el
   -- derroche que ya se corrigio en el brief de CEO.
   AND EXISTS (SELECT 1 FROM workspace_members m
                WHERE m.workspace_id = c.workspace_id AND m.status = 'active')
"""


#: Workspaces reales, activos, con dueño y sin Autopilot todavia.
#:
#: POR QUE EL PROVISIONING VIVE AQUI Y NO EN LA RUTA QUE CREA EL WORKSPACE
#: -----------------------------------------------------------------------
#: Se intento primero desde `routers/workspace_management.py`, y no funciona:
#: `autopilot_workspace_settings` tiene RLS FORZADO con politicas de SELECT y
#: UPDATE pero ninguna de INSERT, asi que el rol de la aplicacion recibe «new row
#: violates row-level security policy». Habria fallado en silencio con cada
#: cliente real, registrando una excepcion que nadie mira.
#:
#: La salida no es aflojar RLS ni darle BYPASSRLS al trafico normal. Es reconocer
#: que encender Autopilot NO es una accion del usuario: es una accion del motor,
#: igual que planificar o vigilar, y por tanto le toca al mismo bucle que ya corre
#: como `nelvyon_jobs` con los privilegios justos que le dio la 552.
#:
#: Ademas cubre mas: un workspace creado por una invitacion, una importacion o un
#: camino que aun no existe tambien acaba con Autopilot encendido, sin tener que
#: acordarse de llamar a nada.
_SQL_SIN_AUTOPILOT = """
SELECT w.id
  FROM workspaces w
  JOIN workspace_members m
    ON m.workspace_id = w.id AND m.role = 'owner' AND m.status = 'active'
 WHERE w.status = 'active'
   AND NOT EXISTS (SELECT 1 FROM autopilot_workspace_settings s
                    WHERE s.workspace_id = w.id)
   AND {workspace_real}
   AND {correo_real}
 ORDER BY w.id
 LIMIT 50
"""


async def provisionar_nuevos(sesion) -> dict[str, Any]:
    """Enciende Autopilot en los workspaces reales que aun no lo tienen.

    Idempotente por construccion: solo mira los que NO tienen ajustes, y
    `nacer_autopilot` tampoco duplica ni reactiva lo que el cliente apago.

    Los inquilinos de prueba quedan fuera a proposito. Generar trabajo real para
    clientes falsos no es autonomia, es ruido: ya costo 153 filas inutiles con el
    CEO brief. Y el limite de 50 por pasada evita que una importacion masiva
    convierta un ciclo del planner en una tarea de horas.
    """
    from core.inquilinos_reales import correo_real, workspace_real

    sql = _SQL_SIN_AUTOPILOT.format(
        workspace_real=workspace_real("w"), correo_real=correo_real("m.email"))
    filas = (await sesion.execute(text(sql))).mappings().all()

    encendidos = []
    for f in filas:
        try:
            await nacer_autopilot(sesion, int(f["id"]))
            encendidos.append(int(f["id"]))
        except Exception:  # noqa: BLE001
            # Un workspace que no se puede provisionar no puede impedir que los
            # demas se provisionen.
            logger.exception("autopilot: no se pudo provisionar el workspace %s",
                             f["id"])
    if encendidos:
        await sesion.commit()
        logger.info("autopilot: encendido en %s workspaces nuevos", len(encendidos))
    return {"candidatos": len(filas), "encendidos": encendidos}


async def planear(sesion, ahora: Optional[datetime] = None) -> dict[str, Any]:
    """Programa el trabajo que toca. Idempotente por periodo.

    No comprueba si ya existe: llama a `planificar`, que inserta y deja que la
    restriccion unica decida. Dos planners simultaneos producen un solo trabajo.
    """
    ahora = ahora or datetime.now(timezone.utc)
    # Antes de planificar, se enciende lo que falte: asi un cliente que se dio de
    # alta hace un minuto entra en ESTA pasada y no en la siguiente.
    provisionados = await provisionar_nuevos(sesion)
    filas = (await sesion.execute(text(_SQL_ELEGIBLES))).mappings().all()

    creados, ya_estaban = [], 0
    for f in filas:
        periodo = periodo_actual(f["cadencia"], ahora)
        job = await planificar(sesion, f["workspace_id"], f["capacidad"], periodo)
        if job is None:
            ya_estaban += 1
        else:
            creados.append(job)
    await sesion.commit()

    if creados:
        logger.info("autopilot planner: %s trabajos nuevos, %s ya existian",
                    len(creados), ya_estaban)
    return {"elegibles": len(filas), "creados": creados,
            "ya_existian": ya_estaban,
            "provisionados": provisionados["encendidos"]}


# ═══════════════════════════════════════════════════════════════════════════
# EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════

#: capacidad -> (handler, validador). El handler llama al servicio OS; el
#: validador decide si lo producido se puede entregar.
_REGISTRO: dict[str, tuple[Callable[..., Awaitable[dict]], Callable[[dict], dict]]] = {}


def registrar(clave: str):
    """Decorador para conectar una capacidad a su servicio OS."""
    def envoltorio(par):
        _REGISTRO[clave] = par
        return par
    return envoltorio


def capacidades_conectadas() -> list[str]:
    return sorted(_REGISTRO)


# ── primera capacidad: la de menor riesgo del catalogo ─────────────────────


async def _snapshot_semanal(sesion, job: dict[str, Any]) -> dict[str, Any]:
    """Resumen semanal de entregables del workspace.

    SOLO LEE. No publica, no envia, no cobra y no borra — por eso es la elegida
    para certificar el nucleo: se le pueden provocar fallos sin consecuencias.

    Llama al servicio OS existente por su propia via de datos; `os_deliverables`
    no se modifica.
    """
    ws = job["workspace_id"]
    r = await sesion.execute(
        text("SELECT count(*) AS total, "
             "       count(*) FILTER (WHERE delivered_at IS NOT NULL) AS entregados, "
             "       count(*) FILTER (WHERE status = 'changes_requested') AS con_cambios "
             "  FROM os_deliverables WHERE workspace_id = :ws"),
        {"ws": ws})
    m = dict(r.mappings().first() or {})
    return {
        "workspace_id": ws,
        "total": int(m.get("total") or 0),
        "entregados": int(m.get("entregados") or 0),
        "con_cambios": int(m.get("con_cambios") or 0),
        "generado_en": datetime.now(timezone.utc).isoformat(),
    }


def _validar_snapshot(resultado: dict[str, Any]) -> dict[str, Any]:
    """Decide si lo producido se puede entregar.

    Un resultado sin workspace, o cuyos numeros no cuadren, NO se entrega: se
    devuelve al ciclo de reintento. Entregar en silencio algo que el sistema sabe
    que esta mal es peor que no entregar.
    """
    fallos = []
    if not resultado.get("workspace_id"):
        fallos.append("sin workspace")
    if resultado.get("total") is None:
        fallos.append("sin recuento")
    if (resultado.get("entregados") or 0) > (resultado.get("total") or 0):
        fallos.append("mas entregados que totales")
    return {"valido": not fallos, "fallos": fallos}


registrar("os_deliverables.snapshot_semanal")((_snapshot_semanal, _validar_snapshot))


def evidencia_de(resultado: dict[str, Any]) -> dict[str, Any]:
    """La prueba verificable de que se entrego ALGO concreto.

    Un hash del contenido y su tamaño: cualquiera puede recomputarlo y comprobar
    que la entrega corresponde a este resultado y no a otro. Sin esto, `delivered`
    seria de nuevo una palabra sin respaldo.
    """
    crudo = json.dumps(resultado, sort_keys=True, ensure_ascii=False)
    return {
        "sha256": hashlib.sha256(crudo.encode()).hexdigest(),
        "bytes": len(crudo.encode()),
        "entregado_en": datetime.now(timezone.utc).isoformat(),
    }


_CAPACIDADES_CARGADAS = False


def asegurar_capacidades() -> None:
    """Carga las capacidades de los 14 servicios. Idempotente y perezoso.

    Perezoso para no crear un import circular —`autopilot_capacidades` importa
    `registrar` de aqui— y para que da igual quien sea el punto de entrada: el
    bucle, una prueba o una consola. Si las capacidades no estuvieran cargadas,
    `ejecutar_uno` no encontraria ejecutor y escalaria trabajo perfectamente sano.
    """
    global _CAPACIDADES_CARGADAS
    if _CAPACIDADES_CARGADAS:
        return
    # Cada modulo se importa por separado a proposito. Si soporte fallara al
    # cargar, los catorce servicios de OS deben seguir funcionando: un fallo de
    # import que apagase TODO Autopilot convertiria un modulo roto en una empresa
    # parada.
    fallos = []
    for modulo in ("core.autopilot_capacidades", "core.autopilot_lifecycle"):
        try:
            __import__(modulo)
        except Exception:  # noqa: BLE001
            fallos.append(modulo)
            logger.exception("autopilot: no se pudo cargar %s", modulo)
    if not fallos:
        _CAPACIDADES_CARGADAS = True


async def ejecutar_uno(sesion, trabajador: Optional[str] = None,
                       ahora: Optional[datetime] = None) -> Optional[dict[str, Any]]:
    """Toma un trabajo y lo lleva hasta entregado, o lo devuelve al ciclo."""
    asegurar_capacidades()
    job = await tomar_trabajo(sesion, trabajador=trabajador, ahora=ahora)
    if job is None:
        await sesion.commit()
        return None

    job_id, capacidad = job["id"], job["capacidad"]
    cap = await leer_capacidad(sesion, capacidad)
    par = _REGISTRO.get(capacidad)

    if cap is None or par is None:
        await fallar(sesion, job_id, EJECUTANDO,
                     f"capacidad sin ejecutor conectado: {capacidad}",
                     max_intentos=0)
        await sesion.commit()
        return {"id": job_id, "resultado": "sin_ejecutor"}

    handler, validador = par

    # ── PRODUCIR ────────────────────────────────────────────────────────
    #
    # El handler corre dentro de un SAVEPOINT y no por prolijidad. Si falla
    # contra la base -- una columna que no existe, un CHECK, un deadlock --
    # PostgreSQL aborta la transaccion entera y a partir de ahi rechaza
    # cualquier orden. Sin el savepoint, `fallar()` tampoco podria escribir: el
    # trabajo se quedaria bloqueado en `executing` hasta que expire el cerrojo y
    # el motivo real se perderia detras de un «transaction is aborted». Con el
    # savepoint solo se deshace lo que hizo el handler y la sesion sigue viva
    # para dejar constancia de por que fallo.
    try:
        async with sesion.begin_nested():
            resultado = await handler(sesion, job)
    except Exception as exc:  # noqa: BLE001
        estado = await fallar(sesion, job_id, EJECUTANDO,
                              f"{type(exc).__name__}: {exc}", cap.max_intentos)
        await sesion.commit()
        logger.warning("autopilot: trabajo %s fallo en %s: %s",
                       job_id, capacidad, type(exc).__name__)
        return {"id": job_id, "resultado": "fallo_ejecucion", "estado": estado}

    await avanzar(sesion, job_id, EJECUTANDO, PRODUCIDO, resultado=resultado)

    # ── VALIDAR ─────────────────────────────────────────────────────────
    veredicto = validador(resultado)
    if not veredicto["valido"]:
        estado = await fallar(sesion, job_id, PRODUCIDO,
                              "validacion fallida: " + ", ".join(veredicto["fallos"]),
                              cap.max_intentos)
        await sesion.commit()
        logger.warning("autopilot: trabajo %s no paso validacion: %s",
                       job_id, veredicto["fallos"])
        return {"id": job_id, "resultado": "invalido", "estado": estado}

    await avanzar(sesion, job_id, PRODUCIDO, VALIDADO, validacion=veredicto)
    await avanzar(sesion, job_id, VALIDADO, ENTREGA_PENDIENTE)

    # ── ENTREGAR ────────────────────────────────────────────────────────
    prueba = evidencia_de(resultado)
    await avanzar(sesion, job_id, ENTREGA_PENDIENTE, ENTREGADO, evidencia=prueba)
    await avanzar(sesion, job_id, ENTREGADO, CONFIRMADO)
    await sesion.commit()

    logger.info("autopilot: trabajo %s confirmado (%s)", job_id, capacidad)
    return {"id": job_id, "resultado": "confirmado", "evidencia": prueba}


# ═══════════════════════════════════════════════════════════════════════════
# PROVISIONING
# ═══════════════════════════════════════════════════════════════════════════


async def nacer_autopilot(sesion, workspace_id: int) -> dict[str, Any]:
    """Enciende Autopilot con defaults SEGUROS al nacer un workspace.

    Solo se activan capacidades `AUTOMATIC_SAFE` y reversibles. Nada que publique,
    envie, cobre o borre se enciende solo: eso exige que el cliente lo active a
    conciencia, y la frontera esta declarada en el catalogo, no aqui.

    Idempotente: repetirlo no duplica ni reactiva lo que el cliente apago.
    """
    await sesion.execute(
        text("INSERT INTO autopilot_workspace_settings "
             "  (workspace_id, habilitado, defaults_aplicados) "
             "VALUES (:ws, true, now()) "
             "ON CONFLICT (workspace_id) DO NOTHING"),
        {"ws": int(workspace_id)})

    r = await sesion.execute(
        text("INSERT INTO autopilot_workspace_capabilities "
             "  (workspace_id, capacidad, habilitada, activada_en) "
             "SELECT :ws, cap.clave, true, now() "
             "  FROM autopilot_capabilities cap "
             " WHERE cap.habilitada "
             "   AND cap.reversible "
             "   AND cap.modo_ejecucion = 'AUTOMATIC_SAFE' "
             "ON CONFLICT (workspace_id, capacidad) DO NOTHING "
             "RETURNING capacidad"),
        {"ws": int(workspace_id)})
    encendidas = [f[0] for f in r.fetchall()]
    logger.info("autopilot: workspace %s nace con %s capacidad(es) seguras",
                workspace_id, len(encendidas))
    return {"workspace_id": int(workspace_id), "capacidades": encendidas}
