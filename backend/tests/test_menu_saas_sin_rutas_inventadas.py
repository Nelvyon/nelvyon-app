"""Cada modulo del menu SaaS tiene pagina real, y nadie inventa endpoints.

EL FALLO QUE ESTO IMPIDE
------------------------
El smoke de los 72 modulos arrastraba seis avisos permanentes:

    WARN api: /api/saas/erp-purchases HTTP 404
    WARN api: /api/saas/erp-inventory HTTP 404
    ... y tres ERP mas, mas /api/saas/ai

No correspondian a ningun defecto. `scripts/lib/saas-nav-modules.mjs` hacia

    const apiPath = SAAS_API_BY_ID[id] ?? `/api/saas/${id}`;

es decir, cuando un modulo no tenia endpoint canonico mapeado se FABRICABA uno
a partir del id del menu. Los cinco modulos ERP viven en rutas anidadas
(`/saas/erp/purchases`) y su id nunca fue un segmento de API, asi que el smoke
pedia una URL que jamas existio y avisaba de que no respondia.

Seis avisos cronicos que no significan nada son peores que ninguno: entrenan a
leer el informe por encima. Y habrian tapado un 404 de verdad.

QUE COMPRUEBA
-------------
Lo que si importa de ese menu: que cada entrada lleve a una pagina que existe.
Y que el cargador no vuelva a inventar rutas.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
NAV = REPO / "apps" / "web" / "src" / "features" / "saas-shell" / "saasNav.ts"
APP = REPO / "apps" / "web" / "src" / "app"
CARGADOR = REPO / "scripts" / "lib" / "saas-nav-modules.mjs"

_ENTRADA = re.compile(r'\{\s*id:\s*"([^"]+)"[^}]*href:\s*"([^"]+)"')


def modulos() -> list[tuple[str, str]]:
    return _ENTRADA.findall(NAV.read_text(encoding="utf-8"))


def _tiene_pagina(href: str) -> bool:
    ruta = APP / href.split("?")[0].split("#")[0].lstrip("/")
    return (ruta / "page.tsx").is_file() or (ruta / "page.ts").is_file()


def test_el_barrido_ve_el_menu_entero():
    """Control positivo: sin esto, un regex roto daria verde con cero modulos."""
    mods = modulos()
    assert len(mods) >= 70, f"solo {len(mods)} modulos detectados; el barrido esta roto"
    ids = {i for i, _ in mods}
    for conocido in ("dashboard", "crm", "inbox", "erp-purchases"):
        assert conocido in ids, f"no se detecta el modulo {conocido}"


def test_cada_modulo_del_menu_tiene_pagina():
    """Un menu que ofrece algo que no existe es un 404 servido al usuario."""
    huerfanos = [(i, h) for i, h in modulos() if not _tiene_pagina(h)]
    assert not huerfanos, (
        "modulos del menu sin pagina:\n  "
        + "\n  ".join(f"{i} -> {h}" for i, h in huerfanos)
    )


def test_el_cargador_no_fabrica_rutas_de_api():
    """La causa raiz de los seis avisos cronicos.

    Si vuelve el `?? \\`/api/saas/${id}\\``, vuelven los falsos 404.
    """
    src = CARGADOR.read_text(encoding="utf-8")
    cuerpo = re.sub(r"//[^\n]*", "", src)
    cuerpo = re.sub(r"/\*.*?\*/", "", cuerpo, flags=re.S)
    assert "?? `/api/saas/" not in cuerpo, (
        "el cargador vuelve a fabricar rutas de API a partir del id del menu"
    )
    assert "soloPagina" in cuerpo, (
        "el cargador ya no marca los modulos sin API: el smoke no puede distinguirlos"
    )


def test_los_modulos_sin_api_son_los_esperados():
    """Control negativo, y a la vez inventario.

    Si un modulo que SI tenia API canonica desaparece del mapa, aparecera aqui
    en vez de convertirse en un `soloPagina` silencioso.
    """
    src = CARGADOR.read_text(encoding="utf-8")
    # Las claves pueden ir con o sin comillas: `crm:` y `"ab-testing":`.
    mapeados = set(re.findall(r'^\s*"?([a-z0-9-]+)"?:\s*"/api/', src, re.M))
    sin_api = sorted({i for i, _ in modulos()} - mapeados)
    esperados = {
        "erp-purchases", "erp-inventory", "erp-manufacturing",
        "erp-projects", "erp-sectors", "ai",
    }
    nuevos = set(sin_api) - esperados
    assert not nuevos, (
        f"modulos que han perdido su API canonica: {sorted(nuevos)} — "
        "si es intencionado, anadelos a `esperados` con su motivo"
    )
