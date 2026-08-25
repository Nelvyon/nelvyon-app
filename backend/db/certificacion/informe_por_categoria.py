"""Evidencia POR CATEGORIA de producto — BLOQUE 5.

Los dos auditores anteriores dan un numero para todo el arbol. Un cero global
esta muy bien, pero no sirve para certificar `crm_y_ventas` frente a un CRM del
mercado: para eso hace falta saber cuantas pantallas tiene esa categoria y que
midio cada regla **sobre esas pantallas**.

Este modulo cruza las tres cosas que ya existen y no inventa ninguna:

  - el inventario cerrado (`capacidades_producto`), que dice que area va a que
    categoria y no deja huerfanas;
  - la auditoria de pantallas, con sus siete reglas;
  - la auditoria de rutas, que dice si la navegacion de esa categoria lleva a
    algun sitio.

El reparto de ficheros a categoria se hace por la MISMA funcion que usa el
inventario. Si se copiara la logica, las dos podrian discrepar y el informe
diria «0 defectos en 7 areas» sobre un conjunto de pantallas distinto del que
audita el guardian.

Uso:
    python -m backend.db.certificacion.informe_por_categoria
    python -m backend.db.certificacion.informe_por_categoria --json
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from backend.db.certificacion import auditoria_de_pantallas as pant
from backend.db.certificacion import auditoria_de_rutas as rut
from backend.db.certificacion import capacidades_producto as inv

# Clases que SI son defecto. `COLOR_SUELTO` es una medida de consistencia: al
# revisar los 454 casos uno a uno, la mayoria son colores de marca ajena, HTML
# generado para la web del cliente, configuracion de widgets de terceros y
# paletas categoricas de estado. Contarlos como defecto seria inventarse
# defectos, que es el mismo vicio que inventarse superioridad.
DEFECTOS = {"RELLENO", "ENLACE_MUERTO", "SIN_ALT", "ALT_INUTIL", "TABLA_SIN_SCROLL", "ANCHO_FIJO"}


def _area_de(fichero: Path) -> str | None:
    """Misma derivacion que `capacidades_producto.areas()`, sobre un fichero."""
    try:
        rel = fichero.relative_to(inv.PAGINAS).as_posix()
    except ValueError:
        return None
    limpio = re.sub(r"\([^)]*\)/", "", rel)
    limpio = re.sub(r"/[^/]+\.tsx$", "", limpio)
    if limpio in ("", rel):
        return "inicio"
    partes = [p for p in limpio.split("/") if p and not p.startswith("[")]
    if not partes:
        return "inicio"
    if inv._NO_ES_PRODUCTO.match(partes[0]):
        return None
    if partes[0] in {"saas", "os"} and len(partes) > 1:
        return "/".join(partes[:2])
    return partes[0]


def informe() -> dict[str, dict]:
    hallazgos_pant = pant.barrido()
    rotos = rut.barrido()

    por_categoria: dict[str, dict] = {
        c: {"areas": sorted(a), "pantallas": 0, "defectos": defaultdict(int),
            "medidas": defaultdict(int), "enlaces_rotos": 0}
        for c, a in inv.reparto().items()
    }

    for f in inv.PAGINAS.rglob("*.tsx"):
        if pant._FUERA.search(f.as_posix()):
            continue
        area = _area_de(f)
        if area is None:
            continue
        categoria = inv.categoria_de(area)
        if categoria is None:
            continue

        celda = por_categoria[categoria]
        celda["pantallas"] += 1

        clave = f.relative_to(pant.RAIZ).as_posix()
        for codigo, _g, _l, _frag in hallazgos_pant.get(clave, []):
            destino = "defectos" if codigo in DEFECTOS else "medidas"
            celda[destino][codigo] += 1
        celda["enlaces_rotos"] += len(rotos.get(clave, []))

    for celda in por_categoria.values():
        celda["defectos"] = dict(celda["defectos"])
        celda["medidas"] = dict(celda["medidas"])
        celda["total_defectos"] = sum(celda["defectos"].values())
    return por_categoria


def main() -> None:
    r = informe()

    if not r:
        raise SystemExit("informe vacio: el inventario no devolvio categorias")
    if sum(c["pantallas"] for c in r.values()) < 200:
        raise SystemExit(
            "menos de 200 pantallas repartidas: la raiz apunta mal y cero "
            "defectos sobre casi nada es un verde que no mide nada."
        )

    if "--json" in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=2, sort_keys=True))
        return

    print(f"{'categoria':28} {'areas':>5} {'pant.':>6} {'defec.':>7} {'404':>5}")
    print("-" * 56)
    for c in sorted(r):
        d = r[c]
        print(f"{c:28} {len(d['areas']):5} {d['pantallas']:6} "
              f"{d['total_defectos']:7} {d['enlaces_rotos']:5}")
    print("-" * 56)
    print(f"{'TOTAL':28} {sum(len(d['areas']) for d in r.values()):5} "
          f"{sum(d['pantallas'] for d in r.values()):6} "
          f"{sum(d['total_defectos'] for d in r.values()):7} "
          f"{sum(d['enlaces_rotos'] for d in r.values()):5}")




def rutas_representativas(por_categoria: int = 3) -> dict[str, list[str]]:
    """Rutas ESTATICAS por categoria, para medirlas en un navegador de verdad.

    Se derivan del mismo inventario que todo lo demas. Escribirlas a mano seria
    exactamente el fallo que este proyecto lleva cuatro bloques evitando: una
    lista que se queda vieja y una medicion que dice cubrir un producto que ya
    no es ese.

    Se excluyen las rutas con segmento dinamico: `/saas/clientes/[id]` necesita
    un `id` que exista, y fabricar uno seria medir un 404 creyendo medir una
    pantalla.
    """
    todas = rut.rutas()
    salida: dict[str, list[str]] = {}

    for categoria, areas in inv.reparto().items():
        candidatas: list[str] = []
        for ruta in todas:
            if "[" in ruta or ruta.startswith("/api/"):
                continue
            partes = [p for p in ruta.strip("/").split("/") if p]
            if not partes:
                area = "inicio"
            elif partes[0] in {"saas", "os"} and len(partes) > 1:
                area = "/".join(partes[:2])
            else:
                area = partes[0]
            if area in areas and inv.categoria_de(area) == categoria:
                candidatas.append(ruta)
        # Las mas cortas primero: la pantalla principal del area antes que sus
        # subpantallas.
        candidatas.sort(key=lambda r: (len(r.split("/")), r))
        salida[categoria] = candidatas[:por_categoria]
    return salida

if __name__ == "__main__":
    main()
