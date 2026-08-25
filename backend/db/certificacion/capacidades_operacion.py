"""Inventario CERRADO de capacidades de OPERACIÓN REAL — BLOQUE 4.

Se DERIVA del árbol, igual que las 39 del Bloque 2 y las 55 del Bloque 3. La
razón es la misma y ya se ganó dos veces: un inventario escrito a mano se infla
o se desinfla según convenga, y entonces el porcentaje no mide nada.

El Bloque 4 es lo que pasa cuando el producto está **en marcha y alguien de
fuera le habla**: un webhook que llega, un trabajo que se encola, una integración
que responde tarde, un pago que se confirma dos veces. Es la superficie donde el
sistema no controla el ritmo ni el orden de lo que le llega.

Por eso la unidad aquí no es «una pantalla» ni «un agente», sino **el punto de
entrada o de salida**: webhooks, colas y crons, integraciones, pagos, OAuth,
observabilidad, salud y GDPR.

Un guardián comprueba las dos direcciones: ningún módulo huérfano y ninguna
capacidad vacía. Cero huérfanos sobre cero módulos sería el verde más vacío
posible, así que hay además un suelo mínimo.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

# En el árbol vive en `backend/db/certificacion/`, de ahí los tres niveles.
# `NELVYON_RAIZ` existe para poder probarlo desde fuera sin tocar el árbol.
RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])

CARPETAS = (
    "backend/stripe",
    "backend/paddle",
    "backend/integrations",
    "backend/queue",
    "backend/oauth",
    "backend/monitoring",
    "backend/health",
    "backend/gdpr",
    "backend/billing",
    "backend/email",
    "backend/logger",
    "apps/web/src/app/api/webhooks",
    "apps/web/src/app/api/saas/webhooks",
    "apps/web/src/app/api/public/v2/webhooks",
    "apps/web/src/app/api/cron",
    "apps/web/src/app/api/health",
)

# Tres modulos que viven fuera de esas carpetas y son el corazon del bloque.
#
# La idempotencia y la cola de fallidos son lo que decide si un webhook repetido
# cobra dos veces o no, pero estan en `backend/saas/` y `backend/mcp/` por
# historia. Incluirlos por ruta explicita es mas honesto que arrastrar carpetas
# enteras de otro bloque solo para alcanzarlos.
SUELTOS = (
    "backend/saas/webhookInIdempotency.ts",
    "backend/saas/SaasWebhookDlqService.ts",
    "backend/mcp/resilience/IdempotencyStore.ts",
)

# (capacidad, familia, patron). ORDEN SIGNIFICATIVO: gana el primero que casa.
MAPA: list[tuple[str, str, str]] = [
    # ── lo que ENTRA de fuera ────────────────────────────────────────────────
    ("webhooks_de_pago", "ENTRADA",
     r"(app/api/webhooks/(stripe|paddle)|backend/(stripe|paddle)/webhookHandler)"),
    ("webhooks_de_canal", "ENTRADA",
     r"app/api/webhooks/(whatsapp|slack|ses)"),
    ("webhooks_de_inquilino", "ENTRADA",
     r"app/api/(saas|public/v2)/webhooks"),
    ("idempotencia_y_fallidos", "ENTRADA",
     r"(webhookInIdempotency|IdempotencyStore|WebhookDlq|webhooks/dlq)"),

    # ── lo que se EJECUTA solo ───────────────────────────────────────────────
    ("colas_y_reintentos", "EJECUCION", r"backend/queue/"),
    ("tareas_programadas", "EJECUCION", r"app/api/cron/"),

    # ── lo que SALE hacia fuera ──────────────────────────────────────────────
    ("integraciones_salientes", "SALIDA", r"backend/integrations/"),
    ("correo_saliente", "SALIDA", r"backend/email/"),

    # ── dinero ───────────────────────────────────────────────────────────────
    ("cobros_y_suscripciones", "DINERO", r"backend/(stripe|paddle|billing)/"),

    # ── identidad de terceros ────────────────────────────────────────────────
    ("oauth_de_proveedores", "IDENTIDAD", r"backend/oauth/"),

    # ── se puede saber qué está pasando ──────────────────────────────────────
    ("observabilidad", "OPERACION", r"backend/(monitoring|logger)/"),
    ("salud_y_disponibilidad", "OPERACION", r"(backend/health/|app/api/health)"),
    ("derechos_del_titular", "OPERACION", r"backend/gdpr/"),
]

_COMPILADO = [(c, f, re.compile(p)) for c, f, p in MAPA]

_FUERA = re.compile(r"__tests__|\.test\.tsx?$|\.spec\.tsx?$|/node_modules/")


def modulos() -> list[str]:
    """Todo `.ts`/`.tsx` de las carpetas de operación, sin pruebas."""
    encontrados: list[str] = []
    for suelto in SUELTOS:
        if (RAIZ / suelto).exists():
            encontrados.append(suelto)
    for carpeta in CARPETAS:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for ext in ("*.ts", "*.tsx"):
            for f in base.rglob(ext):
                rel = f.relative_to(RAIZ).as_posix()
                if not _FUERA.search(rel):
                    encontrados.append(rel)
    return sorted(set(encontrados))


def capacidad_de(ruta: str) -> str | None:
    for capacidad, _familia, patron in _COMPILADO:
        if patron.search(ruta):
            return capacidad
    return None


def familias() -> dict[str, str]:
    return {c: f for c, f, _ in MAPA}


def reparto() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {c: [] for c, _, _ in MAPA}
    for m in modulos():
        c = capacidad_de(m)
        if c:
            out[c].append(m)
    return out


def huerfanos() -> list[str]:
    return [m for m in modulos() if capacidad_de(m) is None]


if __name__ == "__main__":
    r = reparto()
    h = huerfanos()
    if len(modulos()) < 50:
        raise SystemExit(
            f"solo {len(modulos())} modulos: la raiz apunta mal. Cero huerfanos "
            "sobre cero modulos es un verde que no mide nada."
        )
    print(f"modulos: {len(modulos())}  capacidades: {len(r)}  huerfanos: {len(h)}")
    for c, f, _ in MAPA:
        print(f"  [{f:10}] {c:28} {len(r[c]):4}")
    if h:
        print("\nHUERFANOS:")
        for m in h[:40]:
            print("   ", m)
