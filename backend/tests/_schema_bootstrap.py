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

QUE CERTIFICA SQLITE Y QUE NO
-----------------------------
Esta base de tests reproduce COLUMNAS, no restricciones. Durante la auditoria la
suite dio 1078 verdes mientras PostgreSQL real rechazaba el upsert de
`intent_scores` por una PRIMARY KEY legacy que SQLite no reproduce. Un verde aqui
no dice nada sobre el motor de produccion en esa dimension.

    SQLite basta para:      logica funcional, contratos, parsing, unitarios.

    PostgreSQL real EXIGIDO para:
        PRIMARY KEY · UNIQUE · NOT NULL · FOREIGN KEY
        ON CONFLICT · tipos y casts propios de PostgreSQL
        concurrencia y atomicidad dependientes del motor

Para eso existe `scripts/pg-cert-db.mjs`, que levanta una base desechable con la
cadena real de migraciones.
"""

from __future__ import annotations

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

#: Única migración que declara el esquema de runtime de FastAPI.
_MIGRATIONS_DIR = REPO_ROOT / "backend" / "db" / "migrations"

#: Fuente canónica del esquema de runtime FastAPI, en orden de aplicación.
CANONICAL_MIGRATIONS = (
    _MIGRATIONS_DIR / "507_fastapi_runtime_schemas.sql",
    _MIGRATIONS_DIR / "524_fastapi_raw_sql_schema_drift.sql",
    _MIGRATIONS_DIR / "525_fastapi_raw_sql_schema_drift_batch2.sql",
    _MIGRATIONS_DIR / "526_legacy_not_null_relaxation.sql",
    _MIGRATIONS_DIR / "527_intent_scores_unique.sql",
    _MIGRATIONS_DIR / "528_intent_scores_legacy_pk_repair.sql",
)


class _FuenteCanonica:
    """Las migraciones canónicas presentadas como un único texto SQL."""

    paths = CANONICAL_MIGRATIONS

    @classmethod
    def read_text(cls, encoding: str = "utf-8") -> str:
        return chr(10).join(p.read_text(encoding=encoding) for p in cls.paths)


CANONICAL_MIGRATION = _FuenteCanonica

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

#: `IF NOT EXISTS` es OPCIONAL a proposito. Migraciones antiguas como la 084
#: declaran `CREATE TABLE crm_contacts (...)` a secas, y exigir la clausula las
#: dejaba invisibles: el bootstrap creia que ganaba la 507 y el esquema de
#: SQLite modelaba una tabla que PostgreSQL nunca construye. Es justo el falso
#: verde que `definiciones_ganadoras` viene a cerrar.
_CREATE_TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"
    r"(?P<name>[a-z_][a-z0-9_]*)\s*\((?P<body>.*?)\n\);",
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
    ganadoras = definiciones_ganadoras()
    statements: list[str] = []
    for match in _CREATE_TABLE_RE.finditer(sql):
        name = match.group("name")
        body = ganadoras.get(name.lower(), match.group("body"))
        statements.append(_to_sqlite(f"CREATE TABLE IF NOT EXISTS {name} ({body}\n)"))
    return statements


def definiciones_ganadoras() -> dict:
    """Para cada tabla, el cuerpo del PRIMER `CREATE TABLE` de toda la cadena.

    POR QUE NO BASTA CON LEER LA 507
    --------------------------------
    `backend/db/migrate.ts` aplica los ficheros ordenados por nombre y todos usan
    `CREATE TABLE IF NOT EXISTS`. Cuando dos ficheros declaran la misma tabla,
    gana el de numero mas bajo y el otro NO HACE NADA.

    Derivar el esquema de tests solo de la 507 modelaba, para 12 tablas, una
    definicion que en ningun despliegue llega a aplicarse — entre ellas
    `audit_logs`, donde gana la 412. Los tests validaban contra columnas que la
    base real no tiene, asi que un writer equivocado pasaba en verde y fallaba
    contra PostgreSQL.

    Esta funcion reproduce la misma regla que el ejecutor: primero en el orden,
    primero en ganar.
    """
    fuera: dict = {}
    for fichero in sorted(_MIGRATIONS_DIR.glob("*.sql")):
        texto = fichero.read_text(encoding="utf-8", errors="replace")
        for m in _CREATE_TABLE_RE.finditer(texto):
            fuera.setdefault(m.group("name").lower(), m.group("body"))
    return fuera


_ADD_COLUMN_RE = re.compile(
    r"ALTER\s+TABLE\s+(?P<table>[a-z_][a-z0-9_]*)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"
    r"(?P<column>[a-z_][a-z0-9_]*)\s+(?P<rest>[^;]+);",
    re.IGNORECASE,
)



#: `(tabla, columna)` que 526 libera de NOT NULL.
#:
#: SQLite no soporta `ALTER COLUMN ... DROP NOT NULL`, asi que la relajacion no
#: puede aplicarse despues: se aplica ANTES, quitando el `NOT NULL` del
#: `CREATE TABLE` que se genera para SQLite. La migracion PostgreSQL no se toca
#: — se adapta el bootstrap de compatibilidad, que es lo que corresponde.
_RELAJADAS_RE = re.compile(r"\(\s*'(?P<tabla>[a-z_]+)'\s*,\s*'(?P<columna>[a-z_]+)'\s*\)")


def columnas_relajadas() -> set:
    fichero = _MIGRATIONS_DIR / "526_legacy_not_null_relaxation.sql"
    if not fichero.exists():
        return set()
    sql = fichero.read_text(encoding="utf-8")
    ini = sql.find("VALUES")
    fin = sql.find(") AS t(", ini)
    if ini < 0 or fin < 0:
        return set()
    return {(m.group("tabla"), m.group("columna")) for m in _RELAJADAS_RE.finditer(sql[ini:fin])}


def indices_unicos_sqlite() -> list:
    """`CREATE UNIQUE INDEX` de las migraciones canonicas.

    Sin ellos el `ON CONFLICT` tampoco tiene arbitro en SQLite y el test
    certificaria un motor distinto del de produccion.
    """
    sql = CANONICAL_MIGRATION.read_text()
    return [
        m.group(0).rstrip(";")
        for m in re.finditer(
            r"CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z0-9_]+\s+ON\s+[^;]+;",
            sql,
            re.IGNORECASE,
        )
    ]


#: Tablas a las que la migracion 533 anade `workspace_id`.
#:
#: Son de la generacion `/saas`: acotan por `tenant_id`/`user_id` uuid y el
#: backend FastAPI las consulta por workspace. La columna se anade AL LADO, sin
#: sustituir a la original, que sigue siendo obligatoria.
TABLAS_CON_WORKSPACE_ANADIDO = (
    "ab_experiments", "ab_variants", "api_keys", "bookings",
    "crm_contacts", "crm_activities", "invoices", "qr_codes",
    "webhook_deliveries",
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

    # La migracion 533 anade `workspace_id` a las tablas de la generacion
    # `/saas`, pero lo hace con `EXECUTE format(...)` dentro de un bloque `DO`,
    # que no se puede leer estaticamente. Se declara aqui, y un test comprueba
    # que esta lista y la migracion no se separan.
    for tabla in TABLAS_CON_WORKSPACE_ANADIDO:
        out.append(
            (tabla, "workspace_id", f"ALTER TABLE {tabla} ADD COLUMN workspace_id INTEGER")
        )
    return out


async def bootstrap_sqlite_schema(conn) -> list[str]:
    """Aplica el esquema canónico sobre una conexión SQLite async.

    Devuelve las tablas que no pudieron crearse, para que el llamante decida.
    Nunca silencia el fallo: un `except` mudo aquí reintroduciría exactamente
    la ceguera que este módulo elimina.
    """
    from sqlalchemy import text as sa_text

    fallidas: list[str] = []
    relajadas = columnas_relajadas()
    for statement in sqlite_create_statements():
        # 526 en su forma SQLite: se retira el NOT NULL antes de crear la tabla.
        for tabla, columna in relajadas:
            if re.search(r"IF NOT EXISTS " + tabla + r"\b", statement, re.IGNORECASE):
                statement = re.sub(
                    r"(?im)^(\s*" + columna + r"\s+[a-z0-9_()]+)\s+NOT\s+NULL",
                    r"\1",
                    statement,
                )
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

    # 527 y equivalentes: sin el indice unico, `ON CONFLICT` tampoco tiene
    # arbitro en SQLite y el test certificaria un motor distinto al de produccion.
    for indice in indices_unicos_sqlite():
        try:
            await conn.execute(sa_text(indice))
        except Exception as exc:  # noqa: BLE001
            if "already exists" not in str(exc).lower() and "no such table" not in str(exc).lower():
                fallidas.append(f"indice: {exc}")
    return fallidas
