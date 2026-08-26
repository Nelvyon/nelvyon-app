"""Inventario CERRADO de capacidades de operación — BLOQUE 9.

Octavo inventario derivado del árbol. Este mide **lo que hace falta para operar
NELVYON y recuperarlo**, que no es lo mismo que lo que hace falta para
ejecutarlo.

La unidad es la **capacidad de operación**: algo que alguien de guardia usaría a
las tres de la mañana. Un `console.log` no es observabilidad; un fichero de
backup que nadie ha restaurado no es un backup; un runbook que menciona un
comando que no existe es peor que no tener runbook, porque hace perder el tiempo
justo cuando no sobra.

Siete familias, y cada una falla de una manera distinta:

  - `sondas`             — lo que dice si el proceso vive y si puede atender.
  - `interruptores`      — lo que se puede apagar sin desplegar.
  - `correlacion`        — lo que permite seguir una petición entre servicios.
  - `auditoria`          — lo que queda escrito de quién hizo qué.
  - `respaldo_y_restauracion` — lo que devuelve el producto después de un desastre.
  - `migraciones`        — lo que reconstruye el esquema desde cero.
  - `runbooks`           — lo que le dice a una persona qué teclear.

Cada familia lleva su suelo. Cero capacidades es el verde más vacío posible.
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


def _es_prueba(f: Path) -> bool:
    p = f.as_posix()
    return (
        "__tests__" in p
        or "/.next/" in p
        or "node_modules" in p
        or f.name.endswith((".test.ts", ".spec.ts", ".d.ts"))
    )


def _fuentes_ts() -> list[Path]:
    out: list[Path] = []
    for base in ("backend", "apps/web/src"):
        b = RAIZ / base
        if b.exists():
            out.extend(f for f in b.rglob("*.ts") if not _es_prueba(f))
    return sorted(out)


def _texto(f: Path) -> str:
    try:
        return sin_comentarios(io.open(f, encoding="utf-8", errors="replace").read())
    except OSError:
        return ""


def _rel(f: Path) -> str:
    return f.relative_to(RAIZ).as_posix()


# ── Las siete familias ───────────────────────────────────────────────────────

def sondas() -> list[str]:
    """Rutas de salud. Se cuentan por FICHERO de ruta, que es lo que se despliega."""
    base = RAIZ / "apps" / "web" / "src" / "app" / "api" / "health"
    if not base.exists():
        return []
    return sorted(_rel(f) for f in base.rglob("route.ts"))


_INTERRUPTOR = re.compile(
    r"\bNELVYON_[A-Z_0-9]*(?:ENABLED|DISABLED|KILL_SWITCH|FLAG|MODE)[A-Z_0-9]*\b"
)


def interruptores() -> dict[str, int]:
    """Banderas de entorno que apagan o encienden algo SIN desplegar."""
    cuenta: dict[str, int] = {}
    for f in _fuentes_ts():
        for m in _INTERRUPTOR.finditer(_texto(f)):
            cuenta[m.group(0)] = cuenta.get(m.group(0), 0) + 1
    return dict(sorted(cuenta.items()))


_CORRELACION = re.compile(r"requestId|x-request-id|correlationId|requestIdFrom")


def correlacion() -> list[str]:
    return sorted(_rel(f) for f in _fuentes_ts() if _CORRELACION.search(_texto(f)))


_AUDITORIA = re.compile(r"auditLog|SaasAuditService|audit_log|maybeAudit|OsAgentAuditTrail")


def auditoria() -> list[str]:
    return sorted(_rel(f) for f in _fuentes_ts() if _AUDITORIA.search(_texto(f)))


def respaldo_y_restauracion() -> list[str]:
    """Scripts que hacen copia o la devuelven. Un script que no existe no opera."""
    d = RAIZ / "scripts"
    if not d.exists():
        return []
    pat = re.compile(r"backup|restore|restaurac|drill", re.I)
    return sorted(f"scripts/{f.name}" for f in d.iterdir() if f.is_file() and pat.search(f.name))


def migraciones() -> list[str]:
    d = RAIZ / "backend" / "db" / "migrations"
    return sorted(f.name for f in d.glob("*.sql")) if d.exists() else []


def runbooks() -> list[str]:
    """Documentos que le dicen a una PERSONA qué teclear."""
    d = RAIZ / "docs"
    if not d.exists():
        return []
    pat = re.compile(r"runbook|ops|recover|backup|disaster|checklist|puertas", re.I)
    out = [f"docs/{f.name}" for f in d.iterdir() if f.is_file() and pat.search(f.name)]
    sub = d / "ops"
    if sub.exists():
        out.extend(f"docs/ops/{f.name}" for f in sub.iterdir() if f.is_file())
    return sorted(out)


FAMILIAS = {
    "sondas": lambda: sondas(),
    "interruptores": lambda: list(interruptores()),
    "correlacion": lambda: correlacion(),
    "auditoria": lambda: auditoria(),
    "respaldo_y_restauracion": lambda: respaldo_y_restauracion(),
    "migraciones": lambda: migraciones(),
    "runbooks": lambda: runbooks(),
}

# Medido al cerrar el bloque. SUELO, no meta: si baja, un patron se ha roto.
SUELO = {
    "sondas": 4,
    "interruptores": 20,
    "correlacion": 25,
    "auditoria": 20,
    "respaldo_y_restauracion": 3,
    "migraciones": 400,
    "runbooks": 8,
}


def reparto() -> dict[str, list[str]]:
    return {nombre: fn() for nombre, fn in FAMILIAS.items()}


def huerfanas() -> list[str]:
    """Comandos que un runbook manda teclear y NO existen en el árbol.

    Es la huérfana de este inventario, y no es una metáfora: un runbook que dice
    «ejecuta `scripts/foo.mjs`» y `foo.mjs` no existe hace perder minutos a las
    tres de la mañana. Se buscan las referencias a `scripts/*.mjs` y `*.py` en
    los runbooks y se comprueba que el fichero esté.
    """
    # OJO CON EL PREFIJO. La primera version casaba `scripts/(nombre)` y resolvia
    # SIEMPRE contra `RAIZ/scripts/`, asi que daba por inexistentes
    # `backend/scripts/db_backup_restore.py` y `apps/web/scripts/migrate-prod.ts`,
    # que existen los dos. Un detector que grita por rutas correctas se ignora
    # entero, y con el se ignoran los gritos de verdad.
    ref = re.compile(r"((?:[\w.\-]+/)*scripts/[\w.\-]+\.(?:mjs|js|ts|py|sh))")
    faltan: set[str] = set()
    for doc in runbooks():
        try:
            texto = io.open(RAIZ / doc, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for m in ref.finditer(texto):
            rel = m.group(1)
            if (RAIZ / rel).exists():
                continue
            # Un comando marcado como `Placeholder:` NO es una referencia rota:
            # es un runbook que dice honestamente «esto todavia no existe». Se
            # separa en `pendientes()` en vez de silenciarse, porque la
            # diferencia que importa es «falta y nadie lo sabe» frente a
            # «falta y esta escrito». Silenciarlo aqui seria borrar la segunda.
            linea = texto[: m.start()].rsplit(nl_doc(texto), 1)[-1]
            if "placeholder" in linea.lower():
                continue
            faltan.add(f"{doc} -> {rel}")
    return sorted(faltan)


def nl_doc(_texto: str) -> str:
    """El salto de linea del documento. Trivial, pero explicito."""
    return chr(13) + chr(10) if chr(13) + chr(10) in _texto else chr(10)


def pendientes() -> list[str]:
    """Comandos que un runbook declara EXPLICITAMENTE como pendientes.

    No son referencias rotas: son trabajo anunciado. Se cuentan aparte para que
    ni desaparezcan del radar ni contaminen la lista de lo que esta roto.
    """
    ref = re.compile(r"((?:[\w.\-]+/)*scripts/[\w.\-]+\.(?:mjs|js|ts|py|sh))")
    out: set[str] = set()
    for doc in runbooks():
        try:
            texto = io.open(RAIZ / doc, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for m in ref.finditer(texto):
            rel = m.group(1)
            if (RAIZ / rel).exists():
                continue
            linea = texto[: m.start()].rsplit(nl_doc(texto), 1)[-1]
            if "placeholder" in linea.lower():
                out.add(f"{doc} -> {rel}")
    return sorted(out)


if __name__ == "__main__":
    r = reparto()
    print(f"ficheros de produccion: {len(_fuentes_ts())}")
    total = 0
    for nombre in FAMILIAS:
        n = len(r[nombre])
        total += n
        print(f"  {nombre:26} {n:5}")
    print(f"\ncapacidades de operacion: {total}")
    h = huerfanas()
    print(f"comandos de runbook que NO existen: {len(h)}")
    for x in h[:25]:
        print("   ", x)
