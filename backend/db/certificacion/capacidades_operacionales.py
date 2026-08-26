"""Inventario CERRADO de capacidades OPERACIONALES — BLOQUE 6.

Quinto inventario derivado del árbol. Los anteriores midieron el esquema, el
aislamiento, la IA y lo que el cliente ve. Este mide **si NELVYON puede
funcionar solo durante mucho rato y sin que nadie mire**.

La unidad es el **módulo operacional**: el fichero que implementa maquinaria de
ejecución autónoma —orquestar, encolar, reclamar, reintentar, limitar,
recuperar, escalar—. No es «cualquier fichero que mencione la palabra retry»:
eso daba 222 ficheros de los que la inmensa mayoría solo nombraban el concepto
en prosa, y un denominador inflado es tan inútil como uno recortado.

Tampoco entran los agentes de sector. El Bloque 3 ya cerró 55 capacidades de IA
sobre 2224 módulos, y volver a contarlos aquí sería medir dos veces lo mismo con
otro nombre. Lo que este bloque mide es la **capa que los ejecuta**, que es
distinta y estaba sin certificar.

Un guardián comprueba las dos direcciones —ningún módulo huérfano, ninguna
categoría vacía— y lleva suelo mínimo, porque cero huérfanos sobre cero módulos
es el verde más vacío posible y ya pasó una vez en el Bloque 3.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])
BACKEND = RAIZ / "backend"

_FUERA = re.compile(r"__tests__|\.test\.ts$|\.spec\.ts$|node_modules|\.d\.ts$")

# Raíces de maquinaria. Un fichero dentro de una de estas cuenta por estar donde
# está: son carpetas cuyo propósito ENTERO es ejecución autónoma.
_RAICES = (
    "orchestrator/",
    "queue/",
    "mcp/",
)

# Ficheros sueltos de maquinaria que viven fuera de esas raíces. Se enumeran por
# ruta y no por patrón porque son pocos y concretos: un patrón amplio arrastraría
# los 2139 agentes de sector.
_SUELTOS = (
    "saas/webhookInIdempotency.ts",
    "saas/safeEgressUrl.ts",
    "http/cronDeadline.ts",
    "local-ai/router/ExecutionLimiter.ts",
    "autonomous/llm/llmBudget.ts",
    "autonomous/llm/llmAdapter.ts",
)

# `os-agents/*.ts` de primer nivel: el núcleo. Las subcarpetas son agentes.
_NUCLEO_OS = re.compile(r"^os-agents/[^/]+\.ts$")

# `private-ai/` sin sus proveedores concretos, que el Bloque 3 ya certificó.
_NUCLEO_IA = re.compile(r"^private-ai/(core|agents|tools|skills|[^/]+\.ts)")

# (categoria, patron). ORDEN SIGNIFICATIVO: gana el primero que casa.
#
# Las categorías son las propiedades que hay que sostener bajo adversidad, no
# las carpetas: lo que importa de `OsQueueWorker` no es que viva en `os-agents`
# sino que un trabajo no salga dos veces.
MAPA: list[tuple[str, str]] = [
    # ── el trabajo se reclama y no se duplica ───────────────────────────────
    ("colas_y_reclamo", r"^(queue/|os-agents/Os(Queue|JobStore)[^/]*\.ts$)"),
    ("orquestacion", r"^orchestrator/"),

    # ── que un reintento no cobre dos veces ──────────────────────────────────
    ("idempotencia", r"^(saas/webhookInIdempotency\.ts$|mcp/resilience/IdempotencyStore\.ts$)"),

    # ── que un fallo de fuera no arrastre a NELVYON ──────────────────────────
    ("resiliencia_y_limites", r"^(mcp/resilience/|local-ai/router/ExecutionLimiter\.ts$|"
                              r"autonomous/llm/llmBudget\.ts$|http/cronDeadline\.ts$)"),

    # ── que un agente no pueda hacer lo que no le toca ───────────────────────
    ("politica_y_permisos", r"^(mcp/(policy|registry|approvals|audit)/|private-ai/(core|tools|skills)/)"),

    # ── por dónde salen y entran las órdenes ─────────────────────────────────
    ("transporte_mcp", r"^mcp/(client|server|router|tools)/|^mcp/[^/]+\.ts$"),

    # ── quién ejecuta y quién vigila al que ejecuta ──────────────────────────
    ("nucleo_de_agentes", r"^(os-agents/[^/]+\.ts$|private-ai/agents/|private-ai/[^/]+\.ts$)"),

    # ── a dónde sale el trabajo cuando sale de casa ──────────────────────────
    ("egreso_controlado", r"^(saas/safeEgressUrl\.ts$|autonomous/llm/llmAdapter\.ts$)"),
]

_COMPILADO = [(c, re.compile(p)) for c, p in MAPA]


def modulos() -> list[str]:
    """Módulos operacionales, relativos a `backend/`."""
    if not BACKEND.exists():
        return []
    encontrados: set[str] = set()

    for f in BACKEND.rglob("*.ts"):
        rel = f.relative_to(BACKEND).as_posix()
        if _FUERA.search(rel):
            continue
        if (
            rel.startswith(_RAICES)
            or rel in _SUELTOS
            or _NUCLEO_OS.match(rel)
            or _NUCLEO_IA.match(rel)
        ):
            encontrados.add(rel)
    return sorted(encontrados)


def categoria_de(modulo: str) -> str | None:
    for categoria, patron in _COMPILADO:
        if patron.search(modulo):
            return categoria
    return None


def reparto() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {c: [] for c, _ in MAPA}
    for m in modulos():
        c = categoria_de(m)
        if c:
            out[c].append(m)
    return out


def huerfanos() -> list[str]:
    return [m for m in modulos() if categoria_de(m) is None]


if __name__ == "__main__":
    todos = modulos()
    if len(todos) < 40:
        raise SystemExit(
            f"solo {len(todos)} modulos operacionales: la raiz apunta mal. Cero "
            "huerfanos sobre cero modulos es un verde que no mide nada."
        )
    r = reparto()
    h = huerfanos()
    print(f"modulos: {len(todos)}  categorias: {len(r)}  huerfanos: {len(h)}")
    for c, _ in MAPA:
        print(f"  {c:24} {len(r[c]):4}")
    if h:
        print("\nHUERFANOS:")
        for m in h:
            print("   ", m)
