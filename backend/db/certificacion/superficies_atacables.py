"""Inventario CERRADO de superficies atacables — BLOQUE 7.

Sexto inventario derivado del árbol. Los anteriores midieron el esquema, el
aislamiento, la IA, lo que el cliente ve y la maquinaria autónoma. Este mide
**por dónde entra lo que NELVYON no controla**.

La unidad es la **frontera de confianza**: un punto donde una entrada de fuera
—de un usuario anónimo, de otro inquilino, de un proveedor, de un agente— cruza
al interior y pasa a poder cambiar algo. En la práctica, cada `route.ts` bajo
`apps/web/src/app/api` es una de ellas, más las fronteras que no son rutas
(middleware, verificación de firmas, contexto de inquilino).

Lo que este inventario NO hace es contar dos veces. Las propiedades ya
certificadas en bloques anteriores —RLS del esquema, límites de los agentes,
idempotencia de webhooks— no se vuelven a auditar por comodidad: aquí se mira la
**frontera**, es decir quién puede llamar y con qué, no lo que hace el servicio
por dentro una vez le han dejado entrar.

El guardián comprueba las dos direcciones y lleva suelo mínimo, porque cero
huérfanas sobre cero superficies es el verde más vacío posible.
"""

from __future__ import annotations

import io
import os
import re
from pathlib import Path

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])
API = RAIZ / "apps" / "web" / "src" / "app" / "api"

# ─────────────────────────────────────────────────────────────────────────────
# CORRECCION DE DENOMINADOR — la mas importante del Bloque 7.
#
# La primera version de este inventario contaba 531 superficies y declaraba cero
# huerfanas. Estaba mal por un 43%: solo miraba `app/api/**/route.ts`, el
# enrutador nuevo de Next. Este arbol tiene TAMBIEN el enrutador de paginas, y
# bajo `pages/api/` hay **396 rutas mas** — entre ellas 4 de `admin/analytics`
# que leen la cookie de sesion a mano, 66 de integraciones con terceros y 233
# agentes.
#
# Cero huerfanas sobre un denominador al que le falta el 43% del arbol no es un
# verde: es una medida de otra cosa. Se descubrio persiguiendo un tercer sistema
# de claves de API que no aparecia por ningun lado del inventario, y es
# exactamente el fallo contra el que avisa la regla de no reducir el inventario:
# no hizo falta reducirlo a proposito, basto con no mirar donde tambien habia.
#
# Next NO enruta los ficheros ni las carpetas que empiezan por `_`, asi que
# `_auth.ts` y `saas/_deprecated.ts` no son superficies y no se cuentan.
# ─────────────────────────────────────────────────────────────────────────────
PAGES_API = RAIZ / "apps" / "web" / "src" / "pages" / "api"

# Fronteras que no son rutas de API pero deciden quién entra.
_FRONTERAS_EXTRA = (
    "apps/web/src/middleware.ts",
    "apps/web/src/core/auth/AuthContext.tsx",
    "backend/saas/saasRequestContext.ts",
    "backend/saas/safeEgressUrl.ts",
    "backend/db/contextoDeInquilino.ts",
)

# (categoria, patron sobre la ruta relativa a `api/`). ORDEN SIGNIFICATIVO.
#
# Las categorías son por QUIÉN llama y con qué credencial, no por tema de
# producto: lo que decide si una frontera es peligrosa no es de qué trata sino
# quién puede empujarla.
MAPA: list[tuple[str, str]] = [
    # ── lo que entra desde fuera sin sesión ─────────────────────────────────
    ("webhooks_entrantes", r"^webhooks/|^saas/webhooks/|/webhook"),
    ("cron_y_tareas", r"^cron/"),
    ("publico_sin_sesion", r"^(health|status|changelog|roadmap|contact|waitlist|"
                          r"early-adopter|nelvyon-site|public|track|t/|s/|forms|"
                          r"feedback|nps|email-signature|store|support)"),

    # ── identidad ────────────────────────────────────────────────────────────
    ("autenticacion", r"^auth/"),
    ("oauth_y_terceros", r"^oauth/|^integrations/"),
    ("claves_y_scim", r"^scim/|api-keys|^v1/|^usage/"),

    # ── el panel del inquilino ───────────────────────────────────────────────
    ("panel_inquilino", r"^saas/"),
    ("administracion", r"^admin/"),

    # ── superficies con su propia audiencia ──────────────────────────────────
    ("portal_y_partners", r"^(platform/portal|affiliates|packs)"),
    ("agentes_y_mcp", r"^mcp/|^os/"),

    # ── lo que queda del producto autenticado ────────────────────────────────
    ("producto_autenticado", r"."),
]

_COMPILADO = [(c, re.compile(p)) for c, p in MAPA]

# Señales de que una frontera comprueba algo. Detectarlas no prueba que la
# comprobación sea correcta —eso lo miden las pruebas ofensivas— pero su
# AUSENCIA sí es una pista fuerte de que no hay nada.
# La lista NO se escribe a ojo: sale de barrer los ayudantes que las rutas
# invocan de verdad. La primera version se la invento a partir de nombres
# plausibles y no conocia `verifyCronFlexible`, con lo que declaraba «sin
# guarda» a doce rutas de cron que **si** comprueban su secreto. Un detector que
# miente en la direccion alarmista es tan inutil como uno que tranquiliza: los
# dos hacen que nadie se fie de la lista.
_GUARDAS = re.compile(
    r"requireSaasContext|requirePlatformClaims|requirePlatformAdmin|"
    r"requirePlatformContext|requireOsWorkspaceAccess|requirePublicApiContext|"
    r"requirePortalClaims|assertUserCanAccessWorkspace|ensureWorkspaceMember|"
    r"verifyCronHeader|verifyCronBearer|verifyCronFlexible|"
    r"verifyStripeWebhook|verifySnsSignature|verifySlackSignature|"
    r"verifyTrackingToken|verifyLearnerAccessToken|verifyPortalApprovalToken|"
    r"verifyOidcIdToken|authenticate\(|assertAdmin|requireAdmin|"
    r"CRON_SECRET|constantTimeEqual|createHmac|timingSafeEqual|"
    # Handlers de webhook que verifican dentro. Se nombran porque el import
    # viene de un paquete (`@nelvyon/...`) y no de una ruta relativa, asi que la
    # deteccion transitiva por imports locales no llega.
    r"handleStripe[A-Za-z]*Webhook|handleStripeConnectWebhook|"
    # Modismos del enrutador de PAGINAS, que no usa los mismos ayudantes:
    # `req.cookies.nelvyon_token` + `getAuthService().verifyToken(...)`.
    # Sin esto, las 396 rutas de `pages/api` salian todas «sin guarda» — y una
    # lista de 277 nombres que en su mayoria SI comprueban no la lee nadie.
    # `getAuthService()` a secas NO vale: `auth/login` y `auth/register` lo usan
    # para EMITIR un token, y con el en la lista pasaban a parecer guardadas.
    # Afilar una regla y cegarla son el mismo gesto; lo que se busca es la
    # comprobacion, no el servicio.
    r"verifyToken\(|req\.cookies\.nelvyon_token|"
    r"deprecatedRoute|requireAdminUser|withAuth\("
)


def _es_enrutada(rel: Path) -> bool:
    """Next ignora todo segmento que empiece por `_`."""
    return not any(parte.startswith("_") for parte in rel.parts)


def rutas_app() -> list[str]:
    """Rutas del enrutador nuevo, relativas a `app/api/`."""
    if not API.exists():
        return []
    return sorted(
        f.parent.relative_to(API).as_posix() + "/route.ts"
        for f in API.rglob("route.ts")
    )


def rutas_pages() -> list[str]:
    """Rutas del enrutador de paginas, con prefijo para no confundirlas."""
    if not PAGES_API.exists():
        return []
    out = []
    for f in PAGES_API.rglob("*.ts"):
        rel = f.relative_to(PAGES_API)
        if not _es_enrutada(rel):
            continue
        out.append("pages:" + rel.as_posix())
    for f in PAGES_API.rglob("*.tsx"):
        rel = f.relative_to(PAGES_API)
        if _es_enrutada(rel):
            out.append("pages:" + rel.as_posix())
    return sorted(out)


def rutas() -> list[str]:
    """TODAS las rutas de API del producto, de los DOS enrutadores."""
    return rutas_app() + rutas_pages()


def _fichero_de(ruta: str) -> Path:
    """De un nombre de superficie a su fichero en disco."""
    if ruta.startswith("pages:"):
        return PAGES_API / ruta[len("pages:"):]
    return API / ruta


def superficies() -> list[str]:
    return rutas() + [f for f in _FRONTERAS_EXTRA if (RAIZ / f).exists()]


def categoria_de(superficie: str) -> str | None:
    if superficie in _FRONTERAS_EXTRA:
        return "frontera_de_confianza"
    # El prefijo `pages:` es de contabilidad, no de producto: las categorias son
    # por QUIEN llama, y eso no cambia porque la ruta viva en un enrutador o en
    # el otro.
    ruta = superficie[len("pages:"):] if superficie.startswith("pages:") else superficie
    for categoria, patron in _COMPILADO:
        if patron.search(ruta):
            return categoria
    return None


def reparto() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {c: [] for c, _ in MAPA}
    out["frontera_de_confianza"] = []
    for s in superficies():
        c = categoria_de(s)
        if c:
            out[c].append(s)
    return out


def huerfanas() -> list[str]:
    return [s for s in superficies() if categoria_de(s) is None]


_IMPORT_LOCAL = re.compile(r"""from\s+["'](\.[^"']+)["']""")


def _texto(p: Path) -> str:
    try:
        return io.open(p, encoding="utf-8", errors="replace").read()
    except OSError:
        return ""


def _resolver(desde: Path, especificador: str) -> Path | None:
    base = (desde.parent / especificador).resolve()
    for cand in (base.with_suffix(".ts"), base.with_suffix(".tsx"), base / "index.ts"):
        if cand.exists():
            return cand
    return None


def _guarda_transitiva(p: Path, visto: set[Path] | None = None, profundidad: int = 2) -> bool:
    """¿Comprueba algo esta ruta, o algo de lo que importa?

    La deteccion por fichero suelto se equivoca de la peor manera: las nueve
    rutas `os/*/[jobId]` salian «sin guarda» cuando su verificacion vive en
    `downloadArtifactZip`, un ayudante compartido una carpeta mas arriba que
    llama a `authenticate` y filtra por `claims.tenantId`.

    Se siguen los imports LOCALES dos niveles. Dos y no mas porque a partir de
    ahi se acaba tocando medio arbol y todo parece protegido — que es el otro
    modo de que esta lista deje de servir para nada.
    """
    visto = visto if visto is not None else set()
    if p in visto or profundidad < 0:
        return False
    visto.add(p)

    texto = _texto(p)
    if _GUARDAS.search(texto):
        return True
    if profundidad == 0:
        return False
    for m in _IMPORT_LOCAL.finditer(texto):
        destino = _resolver(p, m.group(1))
        if destino and _guarda_transitiva(destino, visto, profundidad - 1):
            return True
    return False


def sin_guarda_detectable() -> list[str]:
    """Rutas donde no se ve NINGUNA comprobación, ni propia ni importada.

    No es una acusación por sí sola: hay fronteras legítimamente públicas. Es la
    lista por la que empezar a mirar, y la que no puede crecer sin que alguien
    lo justifique.
    """
    return [r for r in rutas() if not _guarda_transitiva(_fichero_de(r))]


if __name__ == "__main__":
    todas = superficies()
    if len(todas) < 800:
        raise SystemExit(
            f"solo {len(todas)} superficies: la raiz apunta mal. Cero huerfanas "
            "sobre casi nada es un verde que no mide nada."
        )
    r = reparto()
    h = huerfanas()
    sg = sin_guarda_detectable()
    print(f"superficies: {len(todas)}  categorias: {len(r)}  huerfanas: {len(h)}")
    for c in list(dict.fromkeys([c for c, _ in MAPA] + ["frontera_de_confianza"])):
        print(f"  {c:24} {len(r[c]):4}")
    print(f"\nsin guarda detectable: {len(sg)} de {len(rutas())} rutas")
    for x in sg[:20]:
        print("   ", x)
    if h:
        print("\nHUERFANAS:")
        for x in h:
            print("   ", x)
