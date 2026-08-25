"""Inventario CERRADO de capacidades de PRODUCTO — BLOQUE 5.

Cuarto inventario derivado del árbol. Los tres anteriores midieron lo que el
sistema hace por dentro; este mide **lo que el cliente ve y recibe**, que es lo
único que se puede comparar con un referente del mercado.

La unidad es el **área de producto**: la carpeta de primer nivel bajo la que vive
un conjunto de pantallas con un propósito comercial. `saas/crm` es un área,
`saas/seo` es otra. No se cuenta por pantalla —una misma capacidad puede tener
una o quince— ni por servicio, porque un cliente no contrata servicios, contrata
resultados.

Un guardián comprueba las dos direcciones: ningún área huérfana y ninguna
categoría vacía. Y hay suelo mínimo, porque cero huérfanos sobre cero áreas es el
verde más vacío posible — ya pasó una vez en el Bloque 3.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])

PAGINAS = RAIZ / "apps" / "web" / "src" / "app"

# Carpetas que no son producto: agrupadores de rutas de Next, legales, y la API.
_NO_ES_PRODUCTO = re.compile(
    r"^(api|legal|_|\.|\(|auth|dev|debug|test|sandbox)", re.I
)

# (categoria, patron). ORDEN SIGNIFICATIVO: gana el primero que casa.
#
# Las categorías salen de lo que el mercado compara: nadie evalúa «un CRM y un
# SEO» juntos, los evalúa contra CRMs y contra herramientas de SEO.
MAPA: list[tuple[str, str]] = [
    # ── captación y demanda ──────────────────────────────────────────────────
    ("crm_y_ventas", r"^(saas/)?(crm|pipeline|lead-scoring|prospecting|dialer|citas)$"),
    ("campanias_y_email", r"^(saas/)?(campanias|campaigns|secuencias|deliverability|sms|whatsapp)$"),
    ("seo_y_visibilidad", r"^(saas/)?(seo|benchmark|competitor-gap)$"),
    ("contenido_y_copy", r"^(saas/)?(copywriter|snippets|contenido|knowledge-base|lms|playbooks)$"),
    ("social_y_comunidad", r"^(saas/)?(social|comunidades|loyalty)$"),
    ("publicidad", r"^(saas/)?(publicidad|ab-testing)$"),
    ("reputacion", r"^(saas/)?(reputacion)$"),
    ("funnels_y_conversion", r"^(saas/)?(funnels|formularios|encuestas|countdown|qr|webinar)$"),

    # ── entrega y operación del cliente ──────────────────────────────────────
    ("web_y_tienda", r"^(saas/)?(web-builder|store|ecommerce|productos|site|producto)$"),
    ("entregables_y_packs", r"^(saas/)?(entregables|packs|certificados|documentos|objetos)$"),
    ("soporte_e_inbox", r"^(saas/)?(inbox|helpdesk|chat)$"),
    ("automatizacion", r"^(saas/)?(workflows|automatizacion|automations|autopilot|brief-to-launch)$"),

    # ── datos y decisión ─────────────────────────────────────────────────────
    ("analitica_y_reporting", r"^(saas/)?(analytics|reportes|dashboard|auditoria)$"),

    # ── negocio de la agencia ────────────────────────────────────────────────
    ("agencia_y_partners", r"^(saas/)?(agencia|partner|affiliates|afiliados|subcuentas|white-label|marketplace|servicios)$"),
    ("portal_del_cliente", r"^(saas/)?(portal|memberships|team)$"),
    ("cobro_y_facturacion", r"^(saas/)?(billing|facturas|erp)$"),

    # ── plataforma ───────────────────────────────────────────────────────────
    ("cuenta_y_configuracion", r"^(saas/)?(settings|setup|onboarding|app|admin|security|compliance)$"),
    ("integraciones_y_api", r"^(saas/)?(integraciones|webhooks|api-keys|developers|herramientas|calendar|pwa)$"),
    ("ia_y_agentes", r"^(saas/)?(agentes|ai|voice)$"),

    # ── el sistema operativo de agencia ──────────────────────────────────────
    ("os_servicios_premium", r"^os/.*-premium$"),
    ("os_plataforma", r"^os(/|$)"),

    # ── lo que ve quien todavia no es cliente ────────────────────────────────
    #
    # El sitio publico es producto: es la primera pantalla que evalua un
    # prospecto, y en una comparativa de mercado pesa tanto como el panel.
    ("sitio_publico", r"^(inicio|precios|pricing|blog|contacto|nosotros|sobre-nosotros|"
                      r"faq|casos-de-exito|casos-de-uso|sectores|soluciones|recursos|"
                      r"alternatives|enterprise|plataforma|partners|roadmap|changelog|"
                      r"status|demo|curso|launch|help|desarrollo-web|email-marketing|"
                      r"branding|ads|agencia-ia|automatizaciones-ia|saas)$"),
    ("legales", r"^(aviso-legal|cookies|privacidad|privacy|terminos|terms|seguridad|goodbye)$"),
    ("acceso", r"^(login|register|registro|signup|sign-in|account|client)$"),
    ("enlaces_y_utilidades", r"^(f|s|w|form|offline|example|contracts|saas-w3crm-preview)$"),
]

_COMPILADO = [(c, re.compile(p, re.I)) for c, p in MAPA]


def areas() -> list[str]:
    """Áreas de producto: carpetas de primer y segundo nivel con pantallas."""
    if not PAGINAS.exists():
        return []
    encontradas: set[str] = set()
    for f in PAGINAS.rglob("page.tsx"):
        rel = f.relative_to(PAGINAS).as_posix()
        # Se quitan los grupos de rutas de Next: `(marketing)/precios` → `precios`
        limpio = re.sub(r"\([^)]*\)/", "", rel).removesuffix("/page.tsx")
        if limpio in ("page.tsx", ""):
            encontradas.add("inicio")          # la portada
            continue
        partes = [p for p in limpio.split("/") if p and not p.startswith("[")]
        if not partes:
            continue
        if _NO_ES_PRODUCTO.match(partes[0]):
            continue
        # `saas/crm/...` y `os/ads-premium/...` cuentan por sus dos primeros
        # niveles; el resto, por el primero.
        clave = "/".join(partes[:2]) if partes[0] in {"saas", "os"} and len(partes) > 1 else partes[0]
        encontradas.add(clave)
    return sorted(encontradas)


def categoria_de(area: str) -> str | None:
    for categoria, patron in _COMPILADO:
        if patron.search(area):
            return categoria
    return None


def reparto() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {c: [] for c, _ in MAPA}
    for a in areas():
        c = categoria_de(a)
        if c:
            out[c].append(a)
    return out


def huerfanas() -> list[str]:
    return [a for a in areas() if categoria_de(a) is None]


if __name__ == "__main__":
    todas = areas()
    if len(todas) < 40:
        raise SystemExit(
            f"solo {len(todas)} areas: la raiz apunta mal. Cero huerfanas sobre "
            "cero areas es un verde que no mide nada."
        )
    r = reparto()
    h = huerfanas()
    print(f"areas: {len(todas)}  categorias: {len(r)}  huerfanas: {len(h)}")
    for c, _ in MAPA:
        print(f"  {c:28} {len(r[c]):4}")
    if h:
        print("\nHUERFANAS:")
        for a in h:
            print("   ", a)
