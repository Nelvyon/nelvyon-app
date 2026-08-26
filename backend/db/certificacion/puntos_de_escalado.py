"""Inventario CERRADO de puntos de escalado — BLOQUE 8.

Séptimo inventario derivado del árbol. Los anteriores midieron el esquema, el
aislamiento, la IA, el producto, la maquinaria autónoma y las superficies
atacables. Este mide **lo que cambia cuando dejan de llegar operaciones de una
en una**.

La unidad NO es el módulo ni la ruta: es el **punto de escalado**, un sitio
concreto del código cuyo coste o cuya corrección dependen de N. Se eligió así
porque las otras dos unidades mienten en este bloque. Un módulo puede tener diez
consultas perfectas y una que recorre la tabla entera; una ruta puede ser
irrelevante con un inquilino y ser la que tumba el pool con cien.

Deliberadamente NO se cuentan aquí los módulos ya certificados en bloques
anteriores por sus otras propiedades. Un punto entra en este inventario si y solo
si su comportamiento **cambia con la carga**. Inflar el denominador repitiendo lo
ya medido daría un número más grande y una certificación más pobre.

Seis clases, y cada una se rompe de una manera distinta:

  - `pool_y_transacciones`   — lo que retiene una conexión de PostgreSQL.
  - `estado_en_proceso`      — lo que es correcto con una instancia y falso con dos.
  - `lecturas_sin_cota`      — lo que crece con los datos del inquilino.
  - `trabajo_en_serie`       — lo que tarda N veces lo que debería.
  - `temporizadores`         — lo que se dispara solo y se solapa consigo mismo.
  - `limites_y_backpressure` — lo que decide cuándo decir que no.

El guardián comprueba las dos direcciones y lleva suelo mínimo: cero huérfanos
sobre cero puntos es el verde más vacío posible.
"""

from __future__ import annotations

import io
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from texto_fuente import sin_comentarios  # noqa: E402

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])
BT = chr(96)


def _es_prueba(f: Path) -> bool:
    p = f.as_posix()
    return (
        "__tests__" in p
        or "/.next/" in p
        or "node_modules" in p
        or f.name.endswith((".test.ts", ".spec.ts", ".d.ts"))
    )


def fuentes() -> list[Path]:
    """TypeScript de producción de los dos lados."""
    out: list[Path] = []
    for base in ("backend", "apps/web/src"):
        b = RAIZ / base
        if not b.exists():
            continue
        out.extend(f for f in b.rglob("*.ts") if not _es_prueba(f))
    return sorted(out)


def _texto(f: Path) -> str:
    """Código SIN comentarios: una regla que casa en la prosa mide la prosa."""
    try:
        return sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
    except OSError:
        return ""


def _rel(f: Path) -> str:
    return f.relative_to(RAIZ).as_posix()


# ── Las seis clases, cada una con lo que la rompe ────────────────────────────
#
# ORDEN SIGNIFICATIVO: un punto pertenece a la primera clase que lo reconoce.
# `withTransaction` dentro de un bucle es primero un problema de conexión y
# después uno de serialización, y conviene contarlo una sola vez.

CLASES: list[tuple[str, re.Pattern[str]]] = [
    # Lo que retiene una conexión. Con `max` conexiones, `max` de estas a la vez
    # y la siguiente petición espera diez segundos y muere.
    (
        "pool_y_transacciones",
        re.compile(r"withTransaction\(|FOR\s+UPDATE|BEGIN;|pg_advisory|new\s+pg\.Pool|new\s+Pool\("),
    ),
    # Correcto con una instancia, falso con dos. Contadores de uso, cachés de
    # idempotencia, singletons con estado: todo lo que vive en el proceso.
    (
        "estado_en_proceso",
        # `export const` incluido: la primera version solo veia `const` y `let` al
        # principio de linea, y se dejaba fuera tres mapas exportados de
        # `os-shell/constants.ts`. Lo destapo el detector de huerfanos, que para
        # eso esta.
        re.compile(
            r"^(?:export\s+)?(?:const|let)\s+\w+\s*[:=][^=\n]*"
            r"new\s+(?:Map|Set|WeakMap)\s*[<(]",
            re.M,
        ),
    ),
    # Lo que crece con los datos del inquilino. Un SELECT sin cota es correcto
    # el primer mes y es un incidente el sexto.
    (
        "lecturas_sin_cota",
        re.compile(
            r"query(?:<[^>]*>)?\(\s*" + BT + r"\s*SELECT(?:(?!LIMIT)(?!" + BT + r").)*" + BT,
            re.S | re.I,
        ),
    ),
    # Lo que tarda N veces lo que debería porque espera una respuesta antes de
    # pedir la siguiente.
    (
        "trabajo_en_serie",
        re.compile(r"for\s*\((?:[^)]*)\)\s*\{(?:(?!\}).){0,800}?await\s", re.S),
    ),
    # Lo que se dispara solo. Si tarda más que su periodo, se solapa consigo
    # mismo — y dos ejecuciones del mismo trabajo no suelen ser inocuas.
    ("temporizadores", re.compile(r"\bsetInterval\s*\(|\bcron\.schedule\(|\bschedule\w*\(")),
    # Lo que dispara N peticiones a la vez sin cota. Con diez elementos es una
    # optimizacion; con diez mil es un ataque de denegacion contra uno mismo.
    # OJO con la distincion: `Promise.all([a, b, c])` sobre un array LITERAL
    # esta acotado por construccion y no es un punto de escalado. Lo que
    # escala mal es el abanico sobre algo VARIABLE. La primera version casaba
    # los dos y producia 122 «huerfanos» que eran arrays de tres elementos.
    (
        "abanico_sin_cota",
        re.compile(r"Promise\.all\(\s*(?!\[)[\w$][\w.$]*|while\s*\(\s*true\s*\)"),
    ),
    # Lo que decide cuándo decir que no. Sin esto, la saturación no se contiene:
    # se propaga.
    (
        "limites_y_backpressure",
        re.compile(
            r"RateLimit|rateLimit|checkPublicApiRateLimit|maxBodySize|"
            r"content-length|MAX_[A-Z_]*(?:SIZE|LEN|CHARS|ITEMS)|slice\(0,\s*\d{3,}\)"
        ),
    ),
]


def puntos() -> dict[str, list[tuple[str, int]]]:
    """(fichero, cuántos) por clase. Un fichero puede estar en varias clases."""
    out: dict[str, list[tuple[str, int]]] = {c: [] for c, _ in CLASES}
    for f in fuentes():
        t = _texto(f)
        if not t:
            continue
        for clase, patron in CLASES:
            n = len(patron.findall(t))
            if n:
                out[clase].append((_rel(f), n))
    return {c: sorted(v) for c, v in out.items()}


def ficheros_con_punto() -> set[str]:
    todos: set[str] = set()
    for v in puntos().values():
        todos.update(f for f, _ in v)
    return todos


def total_puntos() -> int:
    return sum(n for v in puntos().values() for _, n in v)


def huerfanos() -> list[str]:
    """Ficheros que casan la deteccion generica y ninguna clase reconoce.

    La deteccion generica es deliberadamente mas ancha que la suma de las
    clases: si algo la casa y ninguna clase lo recoge, es que falta una clase.
    """
    # El generico es a proposito mas ancho que las clases, pero NO tanto como
    # para casar cualquier consulta: `await db.query("UPDATE x WHERE id=$1")` no
    # es un punto de escalado, es una operacion. La primera version lo casaba y
    # producia 263 «huerfanos» que no eran huerfanos de nada — un denominador
    # inflado con ruido es tan inutil como uno recortado.
    generico = re.compile(
        r"Promise\.all\(\s*(?!\[)|\.forEach\(\s*async|"
        r"while\s*\(\s*true\s*\)|\.reduce\(\s*async|"
        # Solo estado de MODULO. Un `new Map()` DENTRO de una funcion es estado
        # local por llamada y no es un punto de escalado: no sobrevive a la
        # peticion ni se comparte entre instancias. La primera version los casaba
        # y producia 68 «huerfanos» que eran variables locales.
        r"^(?:export\s+)?(?:const|let)\s+\w+\s*[:=][^=\n]*new\s+(?:Map|Set|WeakMap)|setInterval\(|"
        r"withTransaction\(|FOR\s+UPDATE",
        re.S | re.M,
    )
    con_clase = ficheros_con_punto()
    fuera: list[str] = []
    for f in fuentes():
        rel = _rel(f)
        if rel in con_clase:
            continue
        if generico.search(_texto(f)):
            fuera.append(rel)
    return sorted(fuera)


if __name__ == "__main__":
    p = puntos()
    tot = total_puntos()
    if len(fuentes()) < 3000:
        raise SystemExit(
            f"solo {len(fuentes())} ficheros de produccion: la raiz apunta mal. "
            "Cero huerfanos sobre casi nada no mide nada."
        )
    print(f"ficheros de produccion: {len(fuentes())}")
    print(f"puntos de escalado: {tot}  en {len(ficheros_con_punto())} ficheros")
    for c, _ in CLASES:
        n = sum(x for _, x in p[c])
        print(f"  {c:26} {n:5} puntos en {len(p[c]):4} ficheros")
    h = huerfanos()
    print(f"\nhuerfanos: {len(h)}")
    for x in h[:25]:
        print("   ", x)
