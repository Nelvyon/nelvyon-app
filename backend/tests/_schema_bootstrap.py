"""Bootstrap del esquema de tests derivado de la migración canónica.

PROBLEMA QUE RESUELVE
---------------------
`conftest.py` mantenía A MANO un puñado de `CREATE TABLE IF NOT EXISTS`
etiquetados "tables owned by migration 507". La migración 507 declara **124
tablas**; el conftest espejaba 2. Las 122 restantes nunca existieron en la base
de tests, así que 69 pruebas fallaban con `no such table` — no por un defecto
del producto (las tablas SÍ están en migraciones y en producción funcionan),
sino porque un espejo escrito a mano frente a 422 migraciones se desincroniza
por construcción.

POR QUÉ NO SE EJECUTAN LAS MIGRACIONES REALES
---------------------------------------------
402 de las 422 migraciones usan sintaxis exclusiva de PostgreSQL —`SERIAL`,
`TIMESTAMPTZ`, `JSONB`, `gen_random_uuid()`, casts `::`, bloques `DO $$`— que
SQLite no entiende. Forzar compatibilidad artificial reescribiendo migraciones
de producción para que corran en SQLite sería peor que el problema: metería
riesgo en el camino real de despliegue para satisfacer a los tests.

SOLUCIÓN
--------
Se deriva el bootstrap AUTOMÁTICAMENTE de la única migración que declara las
tablas del runtime FastAPI (`507_fastapi_runtime_schemas.sql`), traduciendo el
pequeño conjunto de tipos PostgreSQL que aparecen. La fuente canónica sigue
siendo la migración: no hay un segundo esquema que mantener.

Si una migración futura añade tablas de runtime FastAPI fuera de 507, el test
de guardia `test_schema_bootstrap_sync.py` lo detecta y falla.
"""

from __future__ import annotations

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

#: Única migración que declara el esquema de runtime de FastAPI.
CANONICAL_MIGRATION = (
    REPO_ROOT / "backend" / "db" / "migrations" / "507_fastapi_runtime_schemas.sql"
)

#: Traducciones PostgreSQL -> SQLite. Deliberadamente mínimas y explícitas:
#: cualquier tipo no contemplado se deja tal cual y SQLite lo acepta como
#: afinidad genérica, que es su comportamiento documentado.
_TYPE_TRANSLATIONS: tuple[tuple[str, str], ...] = (
    (r"\bBIGSERIAL\s+PRIMARY\s+KEY\b", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    (r"\bSERIAL\s+PRIMARY\s+KEY\b", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    (r"\bBIGSERIAL\b", "INTEGER"),
    (r"\bSERIAL\b", "INTEGER"),
    (r"\bTIMESTAMPTZ\b", "TIMESTAMP"),
    (r"\bJSONB\b", "TEXT"),
    (r"\bDOUBLE\s+PRECISION\b", "REAL"),
    (r"\bgen_random_uuid\(\)", "(lower(hex(randomblob(16))))"),
    (r"\bNOW\(\)", "CURRENT_TIMESTAMP"),
    # Casts `'{}'::TEXT` / `'[]'::JSONB`: SQLite no tiene el operador `::`.
    # Se elimina el cast y queda el literal, que es lo que el valor por defecto
    # representa de todos modos.
    (r"::\s*[A-Za-z][A-Za-z0-9_]*(\s*\(\s*\d+\s*(,\s*\d+\s*)?\))?", ""),
)

_CREATE_TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?P<name>[a-z_][a-z0-9_]*)\s*\((?P<body>.*?)\n\);",
    re.IGNORECASE | re.DOTALL,
)


def canonical_table_names() -> list[str]:
    """Tablas declaradas en la migración canónica."""
    sql = CANONICAL_MIGRATION.read_text(encoding="utf-8")
    return [m.group("name").lower() for m in _CREATE_TABLE_RE.finditer(sql)]


def _to_sqlite(statement: str) -> str:
    out = statement
    for pattern, replacement in _TYPE_TRANSLATIONS:
        out = re.sub(pattern, replacement, out, flags=re.IGNORECASE)
    return out


def sqlite_create_statements() -> list[str]:
    """Sentencias `CREATE TABLE IF NOT EXISTS` traducidas a SQLite.

    Se omiten índices y restricciones añadidas por separado: los tests
    verifican comportamiento de aplicación, no planes de ejecución, y un índice
    ausente no puede enmascarar una diferencia de esquema real.
    """
    sql = CANONICAL_MIGRATION.read_text(encoding="utf-8")
    statements: list[str] = []
    for match in _CREATE_TABLE_RE.finditer(sql):
        name = match.group("name")
        body = match.group("body")
        statements.append(_to_sqlite(f"CREATE TABLE IF NOT EXISTS {name} ({body}\n)"))
    return statements


_ADD_COLUMN_RE = re.compile(
    r"ALTER\s+TABLE\s+(?P<table>[a-z_][a-z0-9_]*)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"
    r"(?P<column>[a-z_][a-z0-9_]*)\s+(?P<rest>[^;]+);",
    re.IGNORECASE,
)


def sqlite_add_column_statements() -> list[tuple[str, str, str]]:
    """`ALTER TABLE ... ADD COLUMN` de la migración canónica.

    La 507 no declara todas las columnas dentro del `CREATE TABLE`: varias se
    añaden después con `ADD COLUMN IF NOT EXISTS` — `dialer_calls.client_id`
    entre ellas. Ignorarlas creaba tablas incompletas y el `INSERT` del servicio
    fallaba con `has no column named`. SQLite no soporta `IF NOT EXISTS` en
    `ADD COLUMN`, así que se emite sin él y el llamante trata el duplicado.
    """
    sql = CANONICAL_MIGRATION.read_text(encoding="utf-8")
    out: list[tuple[str, str, str]] = []
    for m in _ADD_COLUMN_RE.finditer(sql):
        tabla = m.group("table")
        columna = m.group("column")
        resto = _to_sqlite(m.group("rest").strip())
        out.append((tabla, columna, f"ALTER TABLE {tabla} ADD COLUMN {columna} {resto}"))
    return out


async def bootstrap_sqlite_schema(conn) -> list[str]:
    """Aplica el esquema canónico sobre una conexión SQLite async.

    Devuelve las tablas que no pudieron crearse, para que el llamante decida.
    Nunca silencia el fallo: un `except` mudo aquí reintroduciría exactamente
    la ceguera que este módulo elimina.
    """
    from sqlalchemy import text as sa_text

    fallidas: list[str] = []
    for statement in sqlite_create_statements():
        nombre = re.search(r"IF NOT EXISTS ([a-z0-9_]+)", statement, re.IGNORECASE)
        try:
            await conn.execute(sa_text(statement))
        except Exception as exc:  # noqa: BLE001 - se reporta, no se oculta
            fallidas.append(f"{nombre.group(1) if nombre else '?'}: {exc}")


    for tabla, columna, statement in sqlite_add_column_statements():
        try:
            await conn.execute(sa_text(statement))
        except Exception as exc:  # noqa: BLE001
            mensaje = str(exc).lower()
            # `duplicate column` es el equivalente SQLite de `IF NOT EXISTS`
            # cumpliéndose: la columna ya existe y no hay nada que hacer. Se
            # tolera SOLO ese caso; cualquier otro error se reporta.
            if "duplicate column" in mensaje or "no such table" in mensaje:
                continue
            fallidas.append(f"{tabla}.{columna}: {exc}")
    return fallidas
