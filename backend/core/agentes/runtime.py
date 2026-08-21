"""El runtime. Donde se decide si un agente actua, y donde queda escrito todo.

EL ORDEN DE LAS COMPROBACIONES NO ES CASUAL
-------------------------------------------
    1. freno de emergencia   parar tiene prioridad sobre todo lo demas
    2. catalogo              un agente inactivo o inexistente no corre
    3. profundidad           corta las cadenas antes de gastar nada
    4. politica              deny por defecto; aprobacion humana se detiene aqui
    5. presupuesto           se comprueba ANTES de llamar a ningun modelo
    6. modelo                sin endpoint no se degrada a inventar: escala
    7. ejecucion             el agente produce, con sus herramientas y nada mas
    8. confianza             por debajo del umbral no se entrega
    9. evaluador             INDEPENDIENTE; si dice que no, no hay entrega
   10. evidencia             sin ella el CHECK de la base rechaza el estado

Lo caro va despues de lo barato, y lo que protege va antes de lo que actua. Un
presupuesto comprobado despues de llamar al modelo ya pago la llamada.

CADA EJECUCION DEJA UNA FILA
----------------------------
`agent_runs` responde las siete preguntas del contrato: quien decidio, con que
datos, que herramienta, que politica, que evidencia, quien valido y que paso si
fallo. La fila se abre ANTES de actuar y se cierra siempre, tambien cuando algo
revienta: una ejecucion sin rastro es indistinguible de una que nunca ocurrio.

EL EVALUADOR NUNCA ES EL AGENTE
-------------------------------
Se comprueba en tiempo de registro y otra vez en tiempo de ejecucion. Un agente
que se valida a si mismo no valida: firma.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy import text

from core.agentes import politicas, presupuesto
from core.agentes.herramientas import (
    HerramientaDenegada,
    HerramientaDesconocida,
    invocar,
)

logger = logging.getLogger(__name__)

#: Tope duro de caracteres de contexto. Existe ademas del tope de filas porque
#: cincuenta filas de texto libre pueden ser un megabyte.
MAX_CARACTERES_CONTEXTO = 24_000


@dataclass
class Peticion:
    """Lo que se le pide a un agente."""

    agente: str
    accion: str
    workspace_id: int
    entrada: dict[str, Any] = field(default_factory=dict)
    job_id: Optional[int] = None
    profundidad: int = 0


@dataclass
class Resultado:
    """Lo que produjo un agente, antes de saber si se entrega."""

    datos: dict[str, Any]
    confianza: float
    herramientas_usadas: list[str] = field(default_factory=list)
    modelo: Optional[str] = None
    tokens_entrada: int = 0
    tokens_salida: int = 0


#: agente -> (funcion productora, clave del evaluador)
_AGENTES: dict[str, tuple[Callable[..., Awaitable[Resultado]], str]] = {}
#: clave -> funcion evaluadora
_EVALUADORES: dict[str, Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]] = {}


def registrar_evaluador(clave: str):
    def envoltorio(fn):
        _EVALUADORES[clave] = fn
        return fn
    return envoltorio


def registrar_agente(clave: str, evaluador: str):
    """Conecta un agente y le asigna su evaluador.

    El evaluador NO puede ser el propio agente. Se comprueba aqui, al registrar,
    para que un error de ese tipo reviente al arrancar y no en produccion.
    """
    if evaluador == clave:
        raise ValueError(
            f"el agente '{clave}' no puede ser su propio evaluador: "
            "un agente que se valida a si mismo no valida, firma")

    def envoltorio(fn):
        _AGENTES[clave] = (fn, evaluador)
        return fn
    return envoltorio


def agentes_conectados() -> list[str]:
    return sorted(_AGENTES)


def evaluadores_conectados() -> list[str]:
    return sorted(_EVALUADORES)


def _huella(datos: Any) -> str:
    crudo = json.dumps(datos, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(crudo.encode("utf-8")).hexdigest()[:32]


def evidencia_de(resultado: dict[str, Any]) -> dict[str, Any]:
    """Huella verificable de lo producido. Igual que en Autopilot."""
    crudo = json.dumps(resultado, sort_keys=True, default=str, ensure_ascii=False)
    return {"sha256": hashlib.sha256(crudo.encode("utf-8")).hexdigest(),
            "bytes": len(crudo.encode("utf-8"))}


async def _abrir_fila(sesion, p: Peticion, modo: str,
                      politica_id: Optional[int]) -> int:
    r = await sesion.execute(
        text("INSERT INTO agent_runs (workspace_id, agente, accion, job_id, "
             "  profundidad, entrada_hash, modo_ejecucion, politica_id, estado) "
             "VALUES (:ws, :ag, :ac, :job, :prof, :h, :modo, :pol, 'ejecutando') "
             "RETURNING id"),
        {"ws": p.workspace_id, "ag": p.agente, "ac": p.accion, "job": p.job_id,
         "prof": p.profundidad, "h": _huella(p.entrada), "modo": modo,
         "pol": politica_id})
    return int(r.scalar())


async def _cerrar_fila(sesion, run_id: int, estado: str, **campos) -> None:
    sets = ["estado = :estado", "terminado_en = now()"]
    params: dict[str, Any] = {"id": run_id, "estado": estado}
    for k, v in campos.items():
        sets.append(f"{k} = :{k}")
        params[k] = json.dumps(v, default=str) if isinstance(v, (dict, list)) else v
    await sesion.execute(
        text(f"UPDATE agent_runs SET {', '.join(sets)} WHERE id = :id"), params)


class _Caja:
    """Lo unico que un agente recibe del mundo.

    No tiene la sesion, no tiene el `workspace_id` como algo que pueda cambiar y
    no tiene forma de invocar una herramienta que no le hayan concedido. Todo lo
    que use queda anotado en `usadas`, que acaba en la auditoria.
    """

    def __init__(self, sesion, agente: str, permitidas: frozenset[str],
                 workspace_id: int):
        self._sesion = sesion
        self._agente = agente
        self._permitidas = permitidas
        self._ws = int(workspace_id)
        self.usadas: list[str] = []
        self._caracteres = 0

    @property
    def workspace_id(self) -> int:
        return self._ws

    async def usar(self, nombre: str, **kwargs) -> Any:
        salida = await invocar(self._sesion, self._agente, self._permitidas,
                               nombre, self._ws, **kwargs)
        self.usadas.append(nombre)
        # El tope de contexto se aplica aqui, sobre lo que de verdad entra, y no
        # como una intencion en el prompt.
        self._caracteres += len(json.dumps(salida, default=str))
        if self._caracteres > MAX_CARACTERES_CONTEXTO:
            raise RuntimeError(
                f"contexto excedido: {self._caracteres} caracteres sobre un tope "
                f"de {MAX_CARACTERES_CONTEXTO}. Un contexto ilimitado es un coste "
                "ilimitado; si un agente necesita tanto, el problema es la tarea")
        return salida


async def ejecutar(sesion, p: Peticion) -> dict[str, Any]:
    """Ejecuta un agente de principio a fin. Nunca lanza: devuelve el estado."""
    par = _AGENTES.get(p.agente)
    cat = (await sesion.execute(
        text("SELECT departamento, herramientas, confianza_minima, "
             "       coste_max_centimos, profundidad_max, activo, nivel_modelo "
             "  FROM agent_catalog WHERE clave = :a"),
        {"a": p.agente})).mappings().first()

    # ── 1. freno de emergencia ──────────────────────────────────────────
    depto = str(cat["departamento"]) if cat else ""
    freno = await presupuesto.detenido(sesion, p.agente, depto)
    if freno:
        run = await _abrir_fila(sesion, p, "DENY", None)
        await _cerrar_fila(sesion, run, "detenido_por_kill_switch", error=freno)
        await sesion.commit()
        return {"estado": "detenido_por_kill_switch", "motivo": freno, "run": run}

    # ── 2. catalogo ─────────────────────────────────────────────────────
    if cat is None or not cat["activo"] or par is None:
        run = await _abrir_fila(sesion, p, "DENY", None)
        motivo = ("agente sin entrada en el catalogo" if cat is None else
                  "agente desactivado" if not cat["activo"] else
                  "agente en el catalogo pero sin implementacion conectada")
        await _cerrar_fila(sesion, run, "fallo", error=motivo)
        await sesion.commit()
        return {"estado": "fallo", "motivo": motivo, "run": run}

    productor, clave_evaluador = par

    # ── 3. profundidad ──────────────────────────────────────────────────
    if p.profundidad > int(cat["profundidad_max"]):
        run = await _abrir_fila(sesion, p, "DENY", None)
        motivo = (f"profundidad {p.profundidad} sobre un maximo de "
                  f"{cat['profundidad_max']}: cadena cortada para no entrar en bucle")
        await _cerrar_fila(sesion, run, "escalado", error=motivo,
                           escalado_a="operador")
        await sesion.commit()
        return {"estado": "escalado", "motivo": motivo, "run": run}

    # ── 4. politica ─────────────────────────────────────────────────────
    decision = await politicas.decidir(sesion, p.agente, p.accion)
    run = await _abrir_fila(sesion, p, decision.modo, decision.politica_id)

    if not decision.permitido:
        estado = ("esperando_aprobacion" if decision.necesita_aprobacion
                  else "rechazado_por_politica")
        await _cerrar_fila(sesion, run, estado, error=decision.motivo)
        await sesion.commit()
        return {"estado": estado, "motivo": decision.motivo, "run": run}

    # ── 5. presupuesto ──────────────────────────────────────────────────
    coste_max = int(cat["coste_max_centimos"] or 0)
    margen = await presupuesto.hay_margen(sesion, p.workspace_id, coste_max)
    if not margen.permitido:
        await _cerrar_fila(sesion, run, "sin_presupuesto", error=margen.motivo)
        await sesion.commit()
        return {"estado": "sin_presupuesto", "motivo": margen.motivo, "run": run}

    # ── 6. modelo ───────────────────────────────────────────────────────
    nivel = str(cat["nivel_modelo"])
    eleccion = None
    if nivel != "ninguno":
        from core.agentes.router_modelos import elegir

        eleccion = elegir(nivel)
        if eleccion.no_configurado:
            await _cerrar_fila(sesion, run, "sin_modelo", error=eleccion.motivo,
                               escalado_a="operador")
            await sesion.commit()
            return {"estado": "sin_modelo", "motivo": eleccion.motivo, "run": run}

    # ── 7. ejecucion ────────────────────────────────────────────────────
    permitidas = await politicas.herramientas_permitidas(sesion, p.agente)
    caja = _Caja(sesion, p.agente, permitidas, p.workspace_id)
    try:
        # Savepoint por el mismo motivo que en el executor de Autopilot: un error
        # de base aborta la transaccion entera y sin el no se podria ni registrar
        # el fallo.
        async with sesion.begin_nested():
            producido = await productor(caja, p, decision.limites)
    except (HerramientaDenegada, HerramientaDesconocida) as exc:
        await _cerrar_fila(sesion, run, "rechazado_por_politica",
                           error=f"{type(exc).__name__}: {exc}",
                           herramientas_usadas=caja.usadas)
        await presupuesto.anotar_consumo(sesion, p.workspace_id, 0)
        await sesion.commit()
        return {"estado": "rechazado_por_politica", "motivo": str(exc), "run": run}
    except Exception as exc:  # noqa: BLE001
        await _cerrar_fila(sesion, run, "fallo",
                           error=f"{type(exc).__name__}: {exc}",
                           herramientas_usadas=caja.usadas)
        await presupuesto.anotar_consumo(sesion, p.workspace_id, 0)
        await sesion.commit()
        logger.warning("agente %s fallo en %s: %s", p.agente, p.accion,
                       type(exc).__name__)
        return {"estado": "fallo", "motivo": str(exc), "run": run}

    coste = 0
    if eleccion is not None and producido.modelo:
        from core.agentes.router_modelos import coste_estimado_centimos

        coste = coste_estimado_centimos(producido.modelo, producido.tokens_entrada,
                                        producido.tokens_salida)
    await presupuesto.anotar_consumo(sesion, p.workspace_id, coste)

    comun = {
        "resultado": producido.datos,
        "confianza": producido.confianza,
        "herramientas_usadas": caja.usadas,
        "modelo": producido.modelo,
        "tokens_entrada": producido.tokens_entrada,
        "tokens_salida": producido.tokens_salida,
        "coste_centimos": coste,
        "contexto_resumen": {"herramientas": len(caja.usadas),
                             "caracteres": caja._caracteres},
    }

    # ── 8. confianza ────────────────────────────────────────────────────
    minima = float(cat["confianza_minima"])
    if producido.confianza < minima:
        await _cerrar_fila(
            sesion, run, "baja_confianza", escalado_a="operador",
            error=(f"confianza {producido.confianza:.2f} por debajo del minimo "
                   f"{minima:.2f}: se escala en vez de entregar"), **comun)
        await sesion.commit()
        return {"estado": "baja_confianza", "confianza": producido.confianza,
                "run": run}

    # ── 9. evaluador independiente ──────────────────────────────────────
    evaluador = _EVALUADORES.get(clave_evaluador)
    if evaluador is None:
        await _cerrar_fila(sesion, run, "fallo",
                           error=f"evaluador '{clave_evaluador}' no conectado",
                           **comun)
        await sesion.commit()
        return {"estado": "fallo", "motivo": "sin evaluador", "run": run}

    veredicto = evaluador(producido.datos, dict(p.entrada))
    if not veredicto.get("valido"):
        await _cerrar_fila(sesion, run, "invalido", evaluador=clave_evaluador,
                           veredicto=veredicto,
                           error="; ".join(veredicto.get("fallos") or []), **comun)
        await sesion.commit()
        return {"estado": "invalido", "fallos": veredicto.get("fallos"), "run": run}

    # ── 10. evidencia y entrega ─────────────────────────────────────────
    await _cerrar_fila(sesion, run, "entregado", evaluador=clave_evaluador,
                       veredicto=veredicto,
                       evidencia=evidencia_de(producido.datos), **comun)
    await sesion.commit()
    return {"estado": "entregado", "run": run, "resultado": producido.datos,
            "confianza": producido.confianza}
