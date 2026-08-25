"""BLOQUE 5 · el informe por categoria reparte lo que dice repartir.

El informe es la evidencia con la que se certifica cada una de las 25
categorias. Ahora mismo da **cero defectos en todas**, y un informe que solo
sabe decir cero es indistinguible de un informe roto: las dos cosas se leen
igual en la tabla.

Por eso aqui hay control positivo. Se mete un defecto real en una pantalla
concreta y se comprueba que aparece **en su categoria y no en otra**. Sin eso,
un fallo en la derivacion de area a categoria pintaria 25 ceros preciosos
mientras el producto se cae a trozos.

Tambien se vigila el fichero generado que consume el navegador. Una lista de
rutas comprometida en el arbol se queda vieja en cuanto alguien anade una
pantalla, y una medicion sobre una lista vieja certifica un producto que ya no
existe.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from backend.db.certificacion import capacidades_producto as inv
from backend.db.certificacion import informe_por_categoria as rep

RUTAS_JSON = (
    Path(inv.__file__).resolve().parents[3]
    / "apps" / "web" / "e2e" / "bloque5" / "rutas_por_categoria.json"
)


@pytest.fixture(scope="module")
def informe() -> dict:
    return rep.informe()


def test_el_informe_cubre_exactamente_el_inventario(informe):
    assert set(informe) == set(inv.reparto())


def test_el_reparto_de_pantallas_tiene_suelo(informe):
    total = sum(c["pantallas"] for c in informe.values())
    assert total >= 300, (
        f"solo {total} pantallas repartidas: cero defectos sobre casi nada es "
        "un verde que no mide nada"
    )


def test_ninguna_categoria_se_queda_sin_pantallas(informe):
    vacias = [c for c, d in informe.items() if d["pantallas"] == 0]
    assert not vacias, f"categorias sin una sola pantalla medida: {vacias}"


def test_el_informe_ve_un_defecto_y_lo_pone_en_su_categoria(tmp_path, monkeypatch):
    """Control positivo: un defecto real tiene que salir, y salir donde toca."""
    # Se fabrica un arbol minimo con una pantalla defectuosa en `saas/crm`, que
    # pertenece a `crm_y_ventas`, y otra limpia en `saas/seo`, que no.
    raiz = tmp_path
    paginas = raiz / "apps" / "web" / "src" / "app"
    (paginas / "saas" / "crm").mkdir(parents=True)
    (paginas / "saas" / "seo").mkdir(parents=True)

    io.open(paginas / "saas" / "crm" / "page.tsx", "w", encoding="utf-8").write(
        'export default function P() { return (<a href="#">Ver</a>); }'
    )
    io.open(paginas / "saas" / "seo" / "page.tsx", "w", encoding="utf-8").write(
        'export default function P() { return (<a href="/seo">Ver</a>); }'
    )

    monkeypatch.setattr(inv, "PAGINAS", paginas)
    monkeypatch.setattr(rep.pant, "PAGINAS", raiz / "apps" / "web" / "src")
    monkeypatch.setattr(rep.pant, "RAIZ", raiz)
    monkeypatch.setattr(rep.rut, "RAIZ", raiz)
    monkeypatch.setattr(rep.rut, "APP", paginas)
    monkeypatch.setattr(rep.rut, "PUBLICO", raiz / "apps" / "web" / "public")

    r = rep.informe()

    assert r["crm_y_ventas"]["defectos"].get("ENLACE_MUERTO") == 1, (
        "el informe no vio un enlace muerto que esta ahi: cualquier cero suyo "
        "deja de significar nada"
    )
    assert not r["seo_y_visibilidad"]["defectos"], (
        "el defecto de una categoria se conto en otra: el reparto esta mal y "
        "los numeros por categoria no valen"
    )


def test_el_fichero_de_rutas_del_navegador_esta_al_dia():
    # Fichero GENERADO y comprometido. Si se desincroniza, la medicion en
    # navegador cubre una lista vieja y dice haber certificado pantallas que ya
    # no existen —o se salta las nuevas sin que nadie lo note.
    assert RUTAS_JSON.exists(), f"falta {RUTAS_JSON}"
    guardado = json.loads(RUTAS_JSON.read_text(encoding="utf-8"))
    actual = rep.rutas_representativas()
    assert guardado == actual, (
        "rutas_por_categoria.json no coincide con el inventario. Regenera con:\n"
        "  python -c \"import io,json;"
        "from backend.db.certificacion.informe_por_categoria import rutas_representativas as r;"
        "io.open('apps/web/e2e/bloque5/rutas_por_categoria.json','w',encoding='utf-8',newline='\\n')"
        ".write(json.dumps(r(),ensure_ascii=False,indent=2,sort_keys=True)+'\\n')\""
    )


def test_toda_categoria_tiene_al_menos_una_ruta_medible():
    faltan = [c for c, v in rep.rutas_representativas().items() if not v]
    assert not faltan, (
        f"categorias sin una sola ruta estatica que medir en navegador: {faltan}"
    )
