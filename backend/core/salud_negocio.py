"""Salud de NEGOCIO: detecta lo que un health de proceso no puede ver.

QUE PROBLEMA RESUELVE
---------------------
`/health` dice si el proceso vive. `/health/ready` dice si PostgreSQL contesta.
Ninguno de los dos vio el fallo real de esta semana: al activar RLS, toda consulta
autenticada devolvia cero filas porque el contexto no se fijaba. Health verde,
producto vacio.

Ese es el modo de fallo dominante aqui, y se repite en muchas formas: entregas que
dejan de producirse, webhooks que se acumulan en reintento, onboarding que se
atasca, cobros que fallan. Todos conviven con un proceso perfectamente sano.

COMO DISTINGUE SENAL DE RUIDO
-----------------------------
Tres mecanismos, y los tres hacen falta:

1. LINEA BASE. Un cero solo es alarmante si antes hubo algo. La tabla
   `business_health_baseline` guarda el ultimo valor sano de cada metrica, asi que
   «esta tabla siempre estuvo vacia» no genera nada y «tenia 1101 y ahora 0» si.

2. UMBRAL RELATIVO. No se alerta por variacion normal. Una caida se reporta
   cuando supera el porcentaje declarado en cada comprobacion, no cuando el numero
   se mueve.

3. COOLDOWN. Una anomalia ya reportada no se repite hasta pasado su periodo. Sin
   esto, una caida sostenida produce una alerta por sondeo y el ruido acaba con
   que nadie mire — que es exactamente el fallo que se quiere evitar.

LO QUE NO HACE
--------------
No repara. No decide. Reporta con estructura suficiente para que otro decida:
que paso, con que evidencia, que impacto tiene, que se intento automaticamente y
si hace falta una persona.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

CRITICO = "critical"
ALTO = "high"
MEDIO = "medium"
INFO = "info"


@dataclass(frozen=True)
class Comprobacion:
    """Una metrica de negocio y las condiciones bajo las que preocupa."""

    metrica: str
    descripcion: str
    sql: str
    #: Caida porcentual a partir de la cual se reporta. 1.0 = solo si cae a cero.
    caida_relevante: float
    severidad: str
    impacto: str
    #: Que se intenta automaticamente antes de escalar. Vacio = nada, se escala.
    accion_automatica: str = ""
    #: Si la anomalia necesita decision humana aunque haya accion automatica.
    requiere_humano: bool = False
    #: Minutos de silencio tras reportarla.
    cooldown_min: int = 60
    #: Si True, un valor que SUBE es lo anomalo (colas, fallos, reintentos).
    subir_es_malo: bool = False


#: Las comprobaciones. Cada una nacio de un fallo real o de un camino que hoy no
#: tiene ninguna vigilancia.
COMPROBACIONES: list[Comprobacion] = [
    # ── el fallo de esta semana, convertido en deteccion ──────────────────
    Comprobacion(
        metrica="clientes_visibles",
        descripcion="Clientes que el producto puede leer",
        sql="SELECT count(*) FROM os_clients",
        caida_relevante=0.5,
        severidad=CRITICO,
        impacto="El producto aparece vacio para los clientes. Es el sintoma exacto "
                "de un fallo de contexto RLS: health sigue verde.",
        accion_automatica="",
        requiere_humano=True,
        cooldown_min=30,
    ),
    Comprobacion(
        metrica="entregables_producidos",
        descripcion="Entregables acumulados",
        sql="SELECT count(*) FROM os_deliverables",
        caida_relevante=0.5,
        severidad=CRITICO,
        impacto="La produccion es lo unico que hoy funciona sin supervision. Si "
                "cae, la empresa deja de entregar y nadie lo sabria.",
        requiere_humano=True,
        cooldown_min=30,
    ),
    Comprobacion(
        metrica="proyectos_activos",
        descripcion="Proyectos registrados",
        sql="SELECT count(*) FROM os_projects",
        caida_relevante=0.5,
        severidad=ALTO,
        impacto="Sin proyectos no hay trabajo que ejecutar.",
        requiere_humano=True,
    ),
    # ── dinero ────────────────────────────────────────────────────────────
    Comprobacion(
        metrica="suscripciones_activas",
        descripcion="Suscripciones en estado activo",
        sql="SELECT count(*) FROM subscriptions WHERE status = 'active'",
        caida_relevante=0.2,
        severidad=CRITICO,
        impacto="Ingresos recurrentes perdidos. Una caida aqui es dinero, no una "
                "metrica.",
        requiere_humano=True,
        cooldown_min=15,
    ),
    Comprobacion(
        metrica="webhooks_stripe_con_error",
        descripcion="Eventos de Stripe marcados con error",
        sql="SELECT count(*) FROM stripe_webhook_events WHERE status = 'error'",
        caida_relevante=0.0,
        severidad=CRITICO,
        impacto="Un cobro que Stripe confirmo y NELVYON no registro. El cliente "
                "pago y no tiene su plan.",
        accion_automatica="reintento con backoff del procesador",
        requiere_humano=True,
        cooldown_min=15,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="webhooks_stripe_atascados",
        descripcion="Eventos que llevan mas de 30 minutos sin procesar",
        sql=(
            "SELECT count(*) FROM stripe_webhook_events "
            "WHERE status IN ('received','processing') "
            "AND received_at < now() - interval '30 minutes'"
        ),
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="Cobros pendientes de aplicar. Stripe reintenta un numero finito "
                "de veces; pasado ese punto el evento se pierde.",
        accion_automatica="reproceso del evento por su id",
        cooldown_min=30,
        subir_es_malo=True,
    ),
    # ── divergencias del circuito de ingresos ─────────────────────────────
    #
    # Cada una es una forma de que el dinero y el estado interno dejen de
    # cuadrar. Ninguna la ve un health de proceso, y todas significan que alguien
    # pago y no tiene lo que compro — o al reves.
    Comprobacion(
        metrica="suscripciones_sin_workspace",
        descripcion="Suscripciones cuyo workspace ya no existe",
        sql=(
            "SELECT count(*) FROM subscriptions s "
            "WHERE s.workspace_id IS NOT NULL "
            "AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = s.workspace_id)"
        ),
        caida_relevante=0.0,
        severidad=CRITICO,
        impacto="Alguien paga por un workspace que no existe. El cobro sigue "
                "corriendo y el cliente no tiene producto.",
        requiere_humano=True,
        cooldown_min=15,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="workspaces_sin_miembros",
        descripcion="Workspaces sin ningun miembro activo",
        sql=(
            "SELECT count(*) FROM workspaces w WHERE NOT EXISTS ("
            "  SELECT 1 FROM workspace_members m "
            "  WHERE m.workspace_id = w.id AND m.status = 'active')"
        ),
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="Un workspace al que nadie puede entrar. Si tiene suscripcion, "
                "es un cliente pagando sin acceso.",
        requiere_humano=True,
        cooldown_min=60,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="pagos_sin_suscripcion",
        descripcion="Checkouts procesados que no dejaron suscripcion",
        sql=(
            "SELECT count(*) FROM stripe_webhook_events e "
            "WHERE e.event_type = 'checkout.session.completed' "
            "AND e.status = 'processed' "
            "AND e.processed_at < now() - interval '10 minutes' "
            "AND NOT EXISTS (SELECT 1 FROM subscriptions s)"
        ),
        caida_relevante=0.0,
        severidad=CRITICO,
        impacto="Stripe confirmo el cobro y NELVYON no lo registro. El cliente "
                "pago y no consta como cliente.",
        requiere_humano=True,
        cooldown_min=15,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="checkouts_sin_completar",
        descripcion="Suscripciones pendientes de mas de 24 horas",
        sql=(
            "SELECT count(*) FROM subscriptions "
            "WHERE status = 'pending' AND created_at < now() - interval '24 hours'"
        ),
        caida_relevante=0.0,
        severidad=MEDIO,
        impacto="Intentos de compra que no llegaron a cobrarse. Cada uno es una "
                "venta perdida que nadie esta persiguiendo.",
        cooldown_min=720,
        subir_es_malo=True,
    ),

    # ── incorporacion ─────────────────────────────────────────────────────
    Comprobacion(
        metrica="onboarding_atascado",
        descripcion="Workspaces con onboarding empezado y sin avanzar en 7 dias",
        sql=(
            "SELECT count(DISTINCT workspace_id) FROM onboarding_progress "
            "WHERE completed = true "
            "AND workspace_id NOT IN ("
            "  SELECT workspace_id FROM onboarding_progress "
            "  WHERE completed_at > now() - interval '7 days')"
        ),
        caida_relevante=0.0,
        severidad=MEDIO,
        impacto="Clientes que entraron y no llegaron a usar el producto. Es la "
                "fuga mas cara: ya se pago su captacion.",
        accion_automatica="",
        requiere_humano=True,
        cooldown_min=1440,
        subir_es_malo=True,
    ),
    # ── soporte ───────────────────────────────────────────────────────────
    Comprobacion(
        metrica="tickets_sin_respuesta",
        descripcion="Tickets abiertos con mas de 24 horas sin primera respuesta",
        # `helpdesk_tickets`, no `support_tickets`.
        #
        # Esta comprobacion nacio apuntando a `support_tickets`: una tabla vacia,
        # sin `workspace_id` y que NINGUN codigo escribe. La base tiene cinco
        # tablas de tickets y solo una esta viva — `helpdesk_tickets`, con 23
        # columnas, modelo, router, contrato canonico de estados y quince
        # consumidores. Preguntando a la muerta, la comprobacion devolvia cero
        # para siempre: un cliente con un ticket pudriendose una semana no habria
        # levantado nada, y el silencio era indistinguible de que todo fuera bien.
        #
        # Se mide la PRIMERA RESPUESTA y no `updated_at` porque es lo que el
        # cliente nota. Un ticket que alguien reetiqueta cada hora sin contestarle
        # esta igual de abandonado.
        sql=(
            "SELECT count(*) FROM helpdesk_tickets "
            "WHERE status NOT IN ('closed','resolved') "
            "AND first_response_minutes IS NULL "
            "AND created_at < now() - interval '24 hours'"
        ),
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="Un cliente esperando. Sin fundador conectado, nadie lo ve.",
        requiere_humano=True,
        cooldown_min=240,
        subir_es_malo=True,
    ),
    # ── usuarios ──────────────────────────────────────────────────────────
    Comprobacion(
        metrica="miembros_activos",
        descripcion="Pertenencias activas a workspaces",
        sql="SELECT count(*) FROM workspace_members WHERE status = 'active'",
        caida_relevante=0.3,
        severidad=ALTO,
        impacto="Si cae, o hay bajas o el aislamiento esta ocultando pertenencias "
                "legitimas — el segundo caso es un fallo, no una metrica.",
        requiere_humano=True,
    ),
    # ── Autopilot: quien vigila al que trabaja solo ───────────────────────
    #
    # Hasta aqui el vigilante miraba el negocio pero no miraba a Autopilot, y
    # Autopilot es justo lo que corre cuando no hay nadie delante. Un motor
    # autonomo sin supervisor no es autonomia: es una caja negra que puede llevar
    # semanas parada sin que nadie lo note, porque un motor que no produce tiene
    # exactamente la misma pinta que uno sin trabajo que hacer.
    Comprobacion(
        metrica="autopilot_trabajos_escalados",
        descripcion="Trabajos de Autopilot que agotaron sus reintentos",
        sql="SELECT count(*) FROM autopilot_jobs WHERE estado = 'escalated'",
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="Autopilot lo intento hasta rendirse. Cada uno es trabajo que el "
                "cliente esperaba y no ha recibido, y nadie lo sabra si no se "
                "avisa: el motor sigue verde porque escalar es su final correcto.",
        accion_automatica="reintento con backoff antes de escalar",
        requiere_humano=True,
        cooldown_min=30,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="autopilot_cola_atascada",
        descripcion="Trabajos vencidos hace mas de una hora y sin tomar",
        sql=(
            "SELECT count(*) FROM autopilot_jobs "
            "WHERE estado = 'scheduled' "
            # `programado_para`, no `creado_en`: un trabajo creado hoy y programado
            # para el lunes no esta atascado, esta esperando su turno.
            "AND COALESCE(proximo_intento, programado_para) < now() - interval '1 hour'"
        ),
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="Hay trabajo listo que nadie recoge. O el executor no corre, o "
                "corre y no llega. Los dos casos se ven igual desde fuera: la cola "
                "crece en silencio.",
        cooldown_min=30,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="autopilot_bloqueados_por_worker_muerto",
        descripcion="Trabajos en ejecucion con el cerrojo ya caducado",
        sql=(
            "SELECT count(*) FROM autopilot_jobs "
            "WHERE estado = 'running' AND locked_until IS NOT NULL "
            "AND locked_until < now() - interval '30 minutes'"
        ),
        caida_relevante=0.0,
        severidad=MEDIO,
        impacto="Un contenedor murio a media ejecucion. El cerrojo caduca por "
                "tiempo y otro worker lo retomara, asi que no es urgente; que se "
                "repita si lo es, porque significa que algo mata contenedores.",
        accion_automatica="el cerrojo expira y otro worker retoma el trabajo",
        cooldown_min=120,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="autopilot_entregas_sin_evidencia",
        descripcion="Trabajos entregados sin evidencia verificable",
        sql=(
            "SELECT count(*) FROM autopilot_jobs "
            "WHERE estado IN ('delivered','confirmed') AND evidencia IS NULL"
        ),
        caida_relevante=0.0,
        severidad=CRITICO,
        impacto="No deberia poder existir: hay un CHECK en la tabla que lo impide. "
                "Si aparece una sola fila, alguien desactivo la restriccion o "
                "escribio por debajo del nucleo. Es el mismo defecto que ya "
                "produjo 2742 entregables marcados como entregados sin nada que "
                "entregar.",
        requiere_humano=True,
        cooldown_min=15,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="autopilot_capacidades_sin_ejecutor",
        descripcion="Trabajos de capacidades que ningun modulo sabe ejecutar",
        sql=(
            "SELECT count(*) FROM autopilot_jobs "
            "WHERE estado = 'escalated' "
            "AND ultimo_error LIKE 'capacidad sin ejecutor conectado%'"
        ),
        caida_relevante=0.0,
        severidad=ALTO,
        impacto="El catalogo promete una capacidad que el codigo no implementa. "
                "Pasa al desplegar una migracion de catalogo sin el modulo que la "
                "atiende, y convierte trabajo sano en trabajo escalado.",
        requiere_humano=True,
        cooldown_min=60,
        subir_es_malo=True,
    ),
    Comprobacion(
        metrica="autopilot_trabajos_confirmados",
        descripcion="Trabajos de Autopilot confirmados en total",
        sql="SELECT count(*) FROM autopilot_jobs WHERE estado = 'confirmed'",
        caida_relevante=1.0,
        severidad=CRITICO,
        impacto="Es el unico numero que dice que Autopilot esta PRODUCIENDO y no "
                "solo encendido. Un acumulado no puede bajar, asi que si baja es "
                "que alguien borro trabajo confirmado.",
        requiere_humano=True,
        cooldown_min=30,
    ),
]


@dataclass
class Hallazgo:
    """Una anomalia, con todo lo que hace falta para decidir sin investigar."""

    metrica: str
    severidad: str
    que_paso: str
    evidencia: dict[str, Any]
    impacto: str
    accion_automatica: str
    requiere_humano: bool

    def como_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metrica,
            "severity": self.severidad,
            "what_happened": self.que_paso,
            "evidence": self.evidencia,
            "impact": self.impacto,
            "automatic_action": self.accion_automatica or "ninguna",
            "needs_human": self.requiere_humano,
        }


async def _valor(sesion, comprobacion: Comprobacion) -> Optional[int]:
    """Ejecuta la metrica. Devuelve None si la tabla no existe en este entorno.

    Una comprobacion que no se puede ejecutar NO cuenta como sana: se informa
    aparte. Tratar «no pude mirar» como «esta bien» seria repetir el error que
    este modulo existe para evitar.

    CADA CONSULTA VA EN SU PROPIO PUNTO DE GUARDADO
    -----------------------------------------------
    En PostgreSQL, una sentencia que falla aborta la transaccion entera: todo lo
    que venga despues muere con `current transaction is aborted`. Sin el
    `begin_nested`, una sola tabla ausente convertia las siete comprobaciones
    siguientes en «no medibles» — un falso verde en cadena, y precisamente el modo
    de fallo que este modulo existe para detectar.

    Lo encontro la propia bateria de pruebas de este fichero.
    """
    try:
        async with sesion.begin_nested():
            resultado = await sesion.execute(text(comprobacion.sql))
            return int(resultado.scalar() or 0)
    except Exception as exc:  # noqa: BLE001
        logger.warning("salud_negocio: %s no se pudo medir: %s",
                       comprobacion.metrica, str(exc)[:200])
        return None


async def _linea_base(sesion, metrica: str) -> Optional[dict[str, Any]]:
    r = await sesion.execute(
        text("SELECT valor_sano, visto_en, silenciada_hasta FROM "
             "business_health_baseline WHERE metrica = :m AND ambito = 'global'"),
        {"m": metrica},
    )
    fila = r.first()
    if fila is None:
        return None
    return {"valor_sano": int(fila[0]), "visto_en": fila[1],
            "silenciada_hasta": fila[2]}


async def _guardar(sesion, metrica: str, valor: int, silenciar_min: int = 0,
                   severidad: Optional[str] = None) -> None:
    hasta = (datetime.now(timezone.utc) + timedelta(minutes=silenciar_min)
             if silenciar_min else None)
    await sesion.execute(
        text(
            "INSERT INTO business_health_baseline "
            "  (metrica, ambito, valor_sano, visto_en, silenciada_hasta, ultima_severidad) "
            "VALUES (:m, 'global', :v, now(), :h, :s) "
            "ON CONFLICT (metrica, ambito) DO UPDATE SET "
            "  valor_sano = EXCLUDED.valor_sano, visto_en = now(), "
            "  silenciada_hasta = COALESCE(EXCLUDED.silenciada_hasta, "
            "                              business_health_baseline.silenciada_hasta), "
            "  ultima_severidad = EXCLUDED.ultima_severidad"
        ),
        {"m": metrica, "v": valor, "h": hasta, "s": severidad},
    )


def evaluar(comprobacion: Comprobacion, actual: int,
            base: Optional[dict[str, Any]]) -> Optional[Hallazgo]:
    """Decide si `actual` es una anomalia. Funcion pura: se prueba sin base."""
    if base is None:
        # Primera observacion: se aprende, no se alarma.
        return None

    sano = base["valor_sano"]

    if comprobacion.subir_es_malo:
        if actual <= sano:
            return None
        return Hallazgo(
            metrica=comprobacion.metrica,
            severidad=comprobacion.severidad,
            que_paso=(f"{comprobacion.descripcion}: subio de {sano} a {actual}"),
            evidencia={"anterior": sano, "actual": actual,
                       "desde": base["visto_en"].isoformat() if base["visto_en"] else None},
            impacto=comprobacion.impacto,
            accion_automatica=comprobacion.accion_automatica,
            requiere_humano=comprobacion.requiere_humano,
        )

    if sano == 0 or actual >= sano:
        return None

    caida = (sano - actual) / sano
    if caida < comprobacion.caida_relevante:
        return None

    a_cero = actual == 0
    return Hallazgo(
        metrica=comprobacion.metrica,
        severidad=CRITICO if a_cero else comprobacion.severidad,
        que_paso=(
            f"{comprobacion.descripcion}: cayo de {sano} a {actual} "
            f"({caida:.0%})" + (" — A CERO" if a_cero else "")
        ),
        evidencia={"anterior": sano, "actual": actual, "caida": round(caida, 3),
                   "desde": base["visto_en"].isoformat() if base["visto_en"] else None},
        impacto=comprobacion.impacto,
        accion_automatica=comprobacion.accion_automatica,
        requiere_humano=comprobacion.requiere_humano,
    )


async def revisar(sesion, ahora: Optional[datetime] = None) -> dict[str, Any]:
    """Ejecuta todas las comprobaciones y devuelve el informe."""
    ahora = ahora or datetime.now(timezone.utc)
    hallazgos: list[Hallazgo] = []
    no_medibles: list[str] = []
    medidas: dict[str, int] = {}

    for comprobacion in COMPROBACIONES:
        actual = await _valor(sesion, comprobacion)
        if actual is None:
            no_medibles.append(comprobacion.metrica)
            continue
        medidas[comprobacion.metrica] = actual

        base = await _linea_base(sesion, comprobacion.metrica)
        hallazgo = evaluar(comprobacion, actual, base)

        if hallazgo is None:
            # Sano: la linea base se mueve al valor de hoy y se limpia el silencio.
            await _guardar(sesion, comprobacion.metrica, actual)
            continue

        silenciada = (base or {}).get("silenciada_hasta")
        if silenciada is not None and silenciada > ahora:
            continue  # ya reportada; el cooldown sigue corriendo

        hallazgos.append(hallazgo)
        # NO se mueve la linea base a un valor enfermo: si se moviera, la segunda
        # comprobacion veria el nuevo valor como normal y la anomalia
        # desapareceria sola sin que nadie la arregle.
        await _guardar(sesion, comprobacion.metrica, base["valor_sano"],
                       silenciar_min=comprobacion.cooldown_min,
                       severidad=hallazgo.severidad)

    await sesion.commit()

    peor = INFO
    for nivel in (CRITICO, ALTO, MEDIO):
        if any(h.severidad == nivel for h in hallazgos):
            peor = nivel
            break

    # `ok` EXIGE HABER PODIDO MIRARLO TODO
    # ------------------------------------
    # Antes esto era `"ok" if not hallazgos else "anomaly"`, y el campo
    # `unmeasurable` iba aparte. El resultado: quien leyera solo `status` —que es
    # lo que hace cualquier consumidor razonable— veia verde estando CIEGO en una
    # o varias comprobaciones.
    #
    # Paso de verdad: con el grant de `helpdesk_tickets` sin aplicar todavia,
    # produccion respondia `status: ok` con `tickets_sin_respuesta` fuera de
    # alcance. Un ticket pudriendose una semana no habria levantado nada, y el
    # informe decia que todo iba bien.
    #
    # Perder observabilidad NO es un estado sano, y gana a todo lo demas: si no
    # se pudo mirar todo, tampoco se puede afirmar que no hay anomalias. Los
    # hallazgos siguen viajando en `findings` — no se ocultan, simplemente no
    # pueden presentarse como el cuadro completo.
    if no_medibles:
        estado = "unknown"
    elif hallazgos:
        estado = "anomaly"
    else:
        estado = "ok"

    return {
        "status": estado,
        "worst_severity": peor,
        "checked_at": ahora.isoformat(),
        "measurements": medidas,
        "unmeasurable": no_medibles,
        # Cuantas se pudieron medir de cuantas. Sin esto, «unknown» obliga a
        # contar a mano para saber si se perdio una comprobacion o veinte.
        "observabilidad": {"medidas": len(medidas),
                           "totales": len(COMPROBACIONES),
                           "completa": not no_medibles},
        "findings": [h.como_dict() for h in hallazgos],
        "needs_human": [h.metrica for h in hallazgos if h.requiere_humano],
    }
