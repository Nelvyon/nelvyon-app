"""Presupuesto y frenos de emergencia. Lo que impide que esto se desboque.

DOS CONTROLES DISTINTOS, A PROPOSITO
------------------------------------
    presupuesto   cuanto puede GASTAR un workspace hoy, y cuantas ejecuciones
                  puede hacer. Frena el coste y frena los bucles.
    kill switch   una fila que detiene NELVYON entero, un departamento o un
                  agente concreto, sin desplegar nada.

Son distintos porque responden a preguntas distintas. El presupuesto responde
«¿nos estamos pasando?». El freno responde «¿hay que parar YA?». Mezclarlos
obligaria a esperar a que se agotara un presupuesto para poder detener algo que
esta haciendo daño ahora mismo.

POR QUE EL TOPE DE EJECUCIONES EXISTE AUNQUE HAYA TOPE DE GASTO
---------------------------------------------------------------
Porque un agente determinista no gasta nada en modelos y aun asi puede entrar en
un bucle: emite un trabajo que emite un trabajo. El gasto seguiria en cero
mientras la base se llena. El tope de ejecuciones lo corta; la profundidad
maxima de la cadena tambien, y son dos redes distintas porque un bucle puede ser
ancho en vez de profundo.

SE COMPRUEBA ANTES
------------------
Siempre. Un presupuesto que se revisa despues de gastar no es un presupuesto, es
un informe.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)

#: Topes por defecto para un workspace que aun no tiene fila del dia.
#:
#: El gasto por defecto es CERO a proposito: gastar dinero de un cliente exige
#: que alguien lo haya autorizado explicitamente escribiendo un tope. Las
#: ejecuciones deterministas —que no cuestan— si tienen un tope generoso, porque
#: su unico riesgo es el bucle.
TOPE_GASTO_POR_DEFECTO_CENTIMOS = 0
TOPE_EJECUCIONES_POR_DEFECTO = 200


@dataclass(frozen=True)
class Veredicto:
    """Si se puede seguir, y si no, por que."""

    permitido: bool
    motivo: str
    gastado: int = 0
    tope: int = 0
    ejecuciones: int = 0
    tope_ejecuciones: int = 0


async def _fila_del_dia(sesion, workspace_id: int) -> dict:
    """Fila de hoy, creandola si no existe. Idempotente entre workers."""
    await sesion.execute(
        text("INSERT INTO agent_budget (workspace_id, dia, tope_centimos, "
             "                          tope_ejecuciones) "
             "VALUES (:ws, CURRENT_DATE, :g, :e) "
             "ON CONFLICT (workspace_id, dia) DO NOTHING"),
        {"ws": int(workspace_id), "g": TOPE_GASTO_POR_DEFECTO_CENTIMOS,
         "e": TOPE_EJECUCIONES_POR_DEFECTO})
    fila = (await sesion.execute(
        text("SELECT gastado_centimos, tope_centimos, ejecuciones, "
             "       tope_ejecuciones FROM agent_budget "
             " WHERE workspace_id = :ws AND dia = CURRENT_DATE"),
        {"ws": int(workspace_id)})).mappings().first()
    return dict(fila or {})


async def hay_margen(sesion, workspace_id: int,
                     coste_estimado: int = 0) -> Veredicto:
    """¿Se puede ejecutar? Se llama ANTES de cualquier trabajo o llamada."""
    f = await _fila_del_dia(sesion, workspace_id)
    gastado = int(f.get("gastado_centimos") or 0)
    tope = int(f.get("tope_centimos") or 0)
    ejec = int(f.get("ejecuciones") or 0)
    tope_ejec = int(f.get("tope_ejecuciones") or 0)

    if ejec >= tope_ejec:
        return Veredicto(False,
                         f"tope de ejecuciones alcanzado hoy ({ejec}/{tope_ejec}); "
                         "puede ser un bucle, y por eso se para en vez de seguir",
                         gastado, tope, ejec, tope_ejec)

    if coste_estimado > 0 and gastado + coste_estimado > tope:
        return Veredicto(False,
                         f"el coste estimado ({coste_estimado} centimos) no cabe "
                         f"en lo que queda de presupuesto ({tope - gastado} de "
                         f"{tope}); nadie autorizo gastar mas",
                         gastado, tope, ejec, tope_ejec)

    return Veredicto(True, "hay margen", gastado, tope, ejec, tope_ejec)


async def anotar_consumo(sesion, workspace_id: int, coste: int = 0) -> None:
    """Suma una ejecucion y su coste. Atomico: `UPDATE ... SET x = x + n`.

    Con `SET x = x + n` la suma la hace PostgreSQL sobre la fila bloqueada, asi
    que dos workers concurrentes no se pisan. Leer, sumar en Python y escribir
    perderia consumo justo cuando mas trabajo hay — que es cuando importa.
    """
    await sesion.execute(
        text("UPDATE agent_budget "
             "   SET ejecuciones = ejecuciones + 1, "
             "       gastado_centimos = gastado_centimos + :c, "
             "       actualizado_en = now() "
             " WHERE workspace_id = :ws AND dia = CURRENT_DATE"),
        {"ws": int(workspace_id), "c": max(0, int(coste))})


# ═══════════════════════════════════════════════════════════════════════════
# Frenos de emergencia
# ═══════════════════════════════════════════════════════════════════════════


async def detenido(sesion, agente: str, departamento: str = "") -> Optional[str]:
    """¿Hay un freno activo que afecte a este agente? Devuelve el motivo o None.

    Se consultan los tres ambitos en una sola consulta. Basta uno activo: parar
    es la accion segura, asi que se resuelve por OR y no por precedencia.
    """
    ambitos = ["global", f"agente:{agente}"]
    if departamento:
        ambitos.append(f"departamento:{departamento}")

    fila = (await sesion.execute(
        text("SELECT ambito, motivo FROM agent_kill_switch "
             " WHERE detenido AND ambito = ANY(:a) LIMIT 1"),
        {"a": ambitos})).mappings().first()
    if fila is None:
        return None
    return f"{fila['ambito']}: {fila['motivo'] or 'detenido sin motivo escrito'}"


async def parar(sesion, ambito: str, motivo: str, por: str = "operador") -> None:
    """Activa un freno. Existe para poder pararlo todo sin desplegar nada."""
    await sesion.execute(
        text("INSERT INTO agent_kill_switch (ambito, detenido, motivo, "
             "                               activado_por, activado_en) "
             "VALUES (:a, true, :m, :p, now()) "
             "ON CONFLICT (ambito) DO UPDATE SET detenido = true, "
             "  motivo = EXCLUDED.motivo, activado_por = EXCLUDED.activado_por, "
             "  activado_en = now()"),
        {"a": ambito, "m": motivo, "p": por})
    logger.error("KILL SWITCH activado en '%s' por %s: %s", ambito, por, motivo)


async def reanudar(sesion, ambito: str) -> None:
    """Desactiva un freno. NO lo hace ningun agente: la politica lo prohibe."""
    await sesion.execute(
        text("UPDATE agent_kill_switch SET detenido = false, activado_en = now() "
             " WHERE ambito = :a"), {"a": ambito})
    logger.warning("kill switch reanudado en '%s'", ambito)
