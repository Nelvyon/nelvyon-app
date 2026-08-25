"""Auditoria de navegacion: ¿los enlaces internos llevan a algun sitio? — BLOQUE 5.

`auditoria_de_pantallas` caza el `href="#"`, que es un enlace que **confiesa**
que no lleva a ninguna parte. Este caza el caso peor: el que **parece** correcto.
`href="/saas/reportes"` se lee bien, pasa cualquier revision por encima, y le da
un 404 al cliente porque la carpeta se llama `reportes-v2`.

No hay forma de verlo leyendo la pantalla: hay que tener delante la tabla de
rutas entera. Por eso se deriva del arbol, igual que el inventario, en vez de
mantenerse a mano.

Reglas del App Router que hay que respetar para no mentir en ninguna direccion:

  - Los grupos `(marketing)` no aparecen en la URL.
  - Un segmento `[id]` casa con cualquier valor.
  - `[...slug]` y `[[...slug]]` se tragan el resto del camino.
  - Una carpeta con `route.ts` es una ruta de API valida aunque no tenga pagina.
  - `public/` sirve ficheros por su ruta literal.

Uso:
    python -m backend.db.certificacion.auditoria_de_rutas
"""

from __future__ import annotations

import io
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

from backend.db.certificacion.texto_fuente import sin_comentarios

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])
APP = RAIZ / "apps" / "web" / "src" / "app"
PUBLICO = RAIZ / "apps" / "web" / "public"

_FUERA = re.compile(r"__tests__|\.test\.tsx?$|\.spec\.tsx?$|node_modules|\.next")

# `href="/algo"`, `href={"/algo"}`, `href={`/algo/${id}`}`. Solo internas: las
# externas no las controla NELVYON y comprobarlas seria salir a la red.
#
# `$` y `{` quedan fuera del captado a proposito: en
# `href={`/os/entregables${filtro}`}` la parte resoluble es `/os/entregables` y
# el resto lo decide el navegador en tiempo de ejecucion. Sin excluirlos, el
# destino capturado era `/os/entregables${filtro}` y se reportaba como roto una
# ruta que existe.
_HREF = re.compile(r"""href=\{?["'`](/[^"'`?#\s${]*)""")

# Destinos que no son navegacion de la aplicacion.
_NO_ES_RUTA = re.compile(r"^/(api/|_next/|__|#)")


def _segmentos_de_ruta(carpeta: Path, base: str = "") -> list[str]:
    """Convierte el arbol de `app/` en la lista de patrones de URL servibles."""
    rutas: list[str] = []
    if not carpeta.exists():
        return rutas

    for hijo in sorted(carpeta.iterdir()):
        if not hijo.is_dir():
            continue
        nombre = hijo.name
        if nombre.startswith(".") or nombre == "node_modules":
            continue

        if nombre.startswith("(") and nombre.endswith(")"):
            # Grupo de rutas: organiza ficheros, no aparece en la URL.
            #
            # Y su propia `page.tsx` sirve la ruta BASE. La portada de NELVYON
            # vive en `(marketing)/page.tsx`, asi que sin esta linea `/` no
            # existia para el auditor y los diecinueve enlaces al inicio del
            # arbol salian rotos: un fallo de la herramienta que habria mandado
            # a corregir diecinueve enlaces que estaban bien.
            if (hijo / "page.tsx").exists() or (hijo / "page.ts").exists():
                rutas.append(base or "/")
            rutas.extend(_segmentos_de_ruta(hijo, base))
            continue
        if nombre.startswith("@"):
            # Slot paralelo: no es un segmento de URL.
            continue

        sub = f"{base}/{nombre}"
        if (hijo / "page.tsx").exists() or (hijo / "page.ts").exists():
            rutas.append(sub)
        if (hijo / "route.ts").exists() or (hijo / "route.tsx").exists():
            rutas.append(sub)
        rutas.extend(_segmentos_de_ruta(hijo, sub))
    return rutas


def rutas() -> list[str]:
    r = _segmentos_de_ruta(APP)
    if (APP / "page.tsx").exists():
        r.append("/")
    return sorted(set(r))


def _a_expresion(patron: str) -> re.Pattern[str]:
    """`/saas/[id]/editar` → expresion que casa `/saas/lo-que-sea/editar`."""
    partes = []
    for seg in patron.strip("/").split("/"):
        if not seg:
            continue
        if re.fullmatch(r"\[\[\.\.\..+\]\]", seg):
            partes.append("(?:/.*)?")       # opcional: casa tambien con nada
            continue
        if re.fullmatch(r"\[\.\.\..+\]", seg):
            partes.append("/.+")
            continue
        if seg.startswith("[") and seg.endswith("]"):
            partes.append("/[^/]+")
            continue
        partes.append("/" + re.escape(seg))
    cuerpo = "".join(partes) or "/"
    return re.compile(rf"^{cuerpo}/?$")


def _ficheros_publicos() -> set[str]:
    if not PUBLICO.exists():
        return set()
    return {
        "/" + f.relative_to(PUBLICO).as_posix()
        for f in PUBLICO.rglob("*")
        if f.is_file()
    }


def _fuentes() -> list[Path]:
    base = RAIZ / "apps" / "web" / "src"
    if not base.exists():
        return []
    return sorted(
        f for f in base.rglob("*.tsx")
        if not _FUERA.search(f.as_posix())
    )


def barrido() -> dict[str, list[tuple[int, str]]]:
    """Devuelve {fichero: [(linea, destino_roto)]}."""
    todas_las_rutas = rutas()
    patrones = [_a_expresion(p) for p in todas_las_rutas]
    estaticos = _ficheros_publicos()

    def existe(destino: str) -> bool:
        limpio = destino.rstrip("/") or "/"
        if limpio in estaticos or destino in estaticos:
            return True
        return any(p.match(limpio) for p in patrones)

    roto: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for f in _fuentes():
        try:
            crudo = io.open(f, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        texto = sin_comentarios(crudo)
        for m in _HREF.finditer(texto):
            destino = m.group(1)
            if _NO_ES_RUTA.match(destino):
                continue
            # Plantilla con interpolacion: `` href={`/os/entregables${filtro}`} ``
            # llega aqui cortada en `/os/entregables`. No se puede resolver
            # entera, pero **el prefijo tiene que ser el principio de alguna
            # ruta real**. Saltarlas sin mas escondia un enlace roto de verdad:
            # `/os/entregables` no existe —esta en `/saas/entregables`— y el
            # sufijo no lo arregla.
            interpolado = texto[m.end() : m.end() + 2] == "${"
            if interpolado:
                if any(r.startswith(destino) for r in todas_las_rutas):
                    continue
            elif existe(destino):
                continue
            linea = texto.count("\n", 0, m.start()) + 1
            roto[f.relative_to(RAIZ).as_posix()].append((linea, destino))
    return dict(roto)


def main() -> None:
    todas = rutas()
    if len(todas) < 100:
        raise SystemExit(
            f"solo {len(todas)} rutas: la raiz apunta mal. Cero enlaces rotos "
            "sobre cero rutas es un verde que no mide nada."
        )

    roto = barrido()
    total = sum(len(v) for v in roto.values())
    print(f"rutas servibles: {len(todas)}")
    print(f"ficheros con enlaces rotos: {len(roto)}")
    print(f"enlaces internos rotos: {total}\n")

    for fichero, hallazgos in sorted(roto.items(), key=lambda x: -len(x[1])):
        print(f"{fichero}  ({len(hallazgos)})")
        for linea, destino in hallazgos[:8]:
            print(f"   {linea:5}  {destino}")

    if "--rutas" in sys.argv:
        print("\n── rutas derivadas ──")
        for r in todas:
            print("  ", r)


if __name__ == "__main__":
    main()
