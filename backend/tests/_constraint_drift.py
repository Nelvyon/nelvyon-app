"""
Incompatibilidad entre el SQL crudo de los servicios y las RESTRICCIONES reales.

El guard de columnas compara nombres. Esta auditoria demostro tres defectos que
ese guard no ve, y los tres rompieron produccion:

    A. `ON CONFLICT(a,b)` sin PK/UNIQUE que lo arbitre
    B. columna NOT NULL sin default que el INSERT no proporciona
    C. la columna ausente ademas forma parte de la PRIMARY KEY

POR QUE `pg_catalog` Y NO LAS MIGRACIONES
-----------------------------------------
El primer intento reconstruia el esquema leyendo las 428 migraciones. Fallo dos
veces contra el catalogo real: `CREATE TABLE IF NOT EXISTS` repetido, tablas
redefinidas, esquemas ajenos y columnas cuyo NOT NULL viene acompanado de un
DEFAULT. Para `api_keys` exigia `plan` y `user_id`, que PostgreSQL no marca
NOT NULL.

Reconstruir un motor con expresiones regulares es la via equivocada. La verdad
la tiene PostgreSQL, y ya sabemos levantar una base desechable con el flujo
runtime-real (`scripts/pg-cert-db.mjs`: migraciones + `create_all`).

DOS PIEZAS SEPARADAS
--------------------
    `analizar_writers()`  — analisis estatico, sin base de datos, testeable con
                            fixtures deterministas.
    `leer_catalogo()`     — lee `pg_catalog`. No infiere nada.
    `comparar()`          — motor de comparacion, puro.

SEMANTICA DEL CONFLICT TARGET, MEDIDA CONTRA POSTGRESQL 16
----------------------------------------------------------
    ON CONFLICT (a, b) + UNIQUE (b, a) -> ACEPTADO   (el orden da igual)
    ON CONFLICT (a)    + UNIQUE (b, a) -> RECHAZADO  (un subconjunto no basta)

Igualdad exacta de CONJUNTOS: por eso se comparan `frozenset`.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ._raw_sql_schema_drift import DIRS_PYTHON, RAIZ, _sql_literales

ON_CONFLICT_DRIFT = "ON_CONFLICT_DRIFT"
NOT_NULL_DRIFT = "NOT_NULL_DRIFT"
PRIMARY_KEY_DRIFT = "PRIMARY_KEY_DRIFT"
UNRESOLVED = "UNRESOLVED_CONSTRAINT"


# ═══════════════════════════════ A. analizador estatico de writers

@dataclass(frozen=True)
class Writer:
    tabla: str
    columnas: frozenset
    conflict_target: frozenset | None
    conflict_por_constraint: str | None
    fichero: str
    #: `ON CONFLICT (...) WHERE ...`. Un indice unico PARCIAL solo sirve de
    #: arbitro si la sentencia repite su predicado; PostgreSQL rechaza el INSERT
    #: si no lo hace. Sin distinguirlo, el analizador daba por rota una escritura
    #: perfectamente valida — y el «arreglo» evidente habria sido quitar el
    #: ON CONFLICT, que es justo lo que protege de una carrera.
    conflict_con_predicado: bool = False


_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+(?:(?P<schema>[a-z_][a-z0-9_]*)\.)?(?P<table>[a-z_][a-z0-9_]*)\s*"
    r"\((?P<cols>[^)]*)\)(?P<resto>.*?)(?=INSERT\s+INTO|\Z)",
    re.IGNORECASE | re.DOTALL,
)
_ON_CONFLICT_COLS_RE = re.compile(r"ON\s+CONFLICT\s*\(\s*(?P<cols>[^)]+?)\s*\)", re.IGNORECASE)
#: El WHERE que sigue al conflict target, antes de DO NOTHING / DO UPDATE.
_ON_CONFLICT_WHERE_RE = re.compile(
    r"ON\s+CONFLICT\s*\([^)]+\)\s*WHERE\s+.+?\s+DO\s+(?:NOTHING|UPDATE)",
    re.IGNORECASE | re.DOTALL,
)
#: `ON CONFLICT ON CONSTRAINT nombre`: arbitro por nombre, no por columnas.
_ON_CONFLICT_NAME_RE = re.compile(
    r"ON\s+CONFLICT\s+ON\s+CONSTRAINT\s+(?P<nombre>[a-z_][a-z0-9_]*)", re.IGNORECASE
)


def _limpia(texto: str) -> frozenset:
    fuera = set()
    for bruto in texto.split(","):
        c = bruto.strip().strip('"').lower()
        if re.fullmatch(r"[a-z_][a-z0-9_]*", c):
            fuera.add(c)
    return frozenset(fuera)


def analizar_writers(sql: str, fichero: str = "<fixture>") -> list:
    """Writers de UNA cadena SQL. Puro: probable con fixtures deterministas."""
    fuera = []
    for m in _INSERT_RE.finditer(sql):
        resto = m.group("resto")
        por_nombre = _ON_CONFLICT_NAME_RE.search(resto)
        cols_target = None if por_nombre else _ON_CONFLICT_COLS_RE.search(resto)
        fuera.append(Writer(
            tabla=m.group("table").lower(),
            columnas=_limpia(m.group("cols")),
            conflict_target=_limpia(cols_target.group("cols")) if cols_target else None,
            conflict_por_constraint=por_nombre.group("nombre").lower() if por_nombre else None,
            fichero=fichero,
            conflict_con_predicado=bool(_ON_CONFLICT_WHERE_RE.search(resto)),
        ))
    return fuera


def writers_del_repo() -> list:
    fuera = []
    for carpeta in DIRS_PYTHON:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for fichero in sorted(base.rglob("*.py")):
            if "__pycache__" in str(fichero):
                continue
            rel = str(fichero.relative_to(RAIZ)).replace(chr(92), "/")
            for sql in _sql_literales(fichero):
                fuera.extend(analizar_writers(sql, rel))
    return fuera


# ═══════════════════════════════ B. inspector de pg_catalog

@dataclass
class TablaPg:
    columnas: set = field(default_factory=set)
    not_null_sin_relleno: set = field(default_factory=set)
    pk: frozenset = frozenset()
    arbitros: set = field(default_factory=set)
    #: Indices unicos PARCIALES o de expresion. Solo valen como arbitro cuando la
    #: sentencia repite el predicado.
    arbitros_parciales: set = field(default_factory=set)
    arbitros_por_nombre: set = field(default_factory=set)
    triggers_insert: bool = False


_SQL_COLUMNAS = """
SELECT c.relname, a.attname, a.attnotnull,
       (d.adbin IS NOT NULL) AS tiene_default,
       (a.attidentity <> '' OR a.attgenerated <> '') AS generada
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE c.relkind = 'r'
"""

#: Solo los indices unicos TOTALES sirven de arbitro por conjunto de columnas.
#: Los parciales (`indpred`) y los de expresion (`indexprs`) obligan al
#: `ON CONFLICT` a repetir su predicado, asi que no se equiparan.
_SQL_ARBITROS = """
SELECT c.relname, i.relname AS indice,
       (SELECT array_agg(att.attname::text ORDER BY att.attname)
          FROM pg_attribute att
         WHERE att.attrelid = ix.indrelid AND att.attnum = ANY(ix.indkey)) AS cols,
       ix.indisprimary,
       (ix.indpred IS NOT NULL OR ix.indexprs IS NOT NULL) AS parcial_o_expresion
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE ix.indisunique
"""

_SQL_TRIGGERS = """
SELECT DISTINCT c.relname FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE NOT t.tgisinternal AND (t.tgtype & 4) <> 0
"""


def leer_catalogo(cursor) -> dict:
    """Restricciones reales por tabla. NO infiere: solo lee PostgreSQL."""
    esquema: dict = {}

    def tabla(nombre):
        return esquema.setdefault(nombre, TablaPg())

    cursor.execute(_SQL_COLUMNAS)
    for relname, attname, notnull, tiene_default, generada in cursor.fetchall():
        t = tabla(relname)
        t.columnas.add(attname)
        # Si PostgreSQL puede producir el valor, el writer no tiene que darlo.
        if notnull and not tiene_default and not generada:
            t.not_null_sin_relleno.add(attname)

    cursor.execute(_SQL_ARBITROS)
    for relname, indice, cols, es_pk, parcial in cursor.fetchall():
        t = tabla(relname)
        t.arbitros_por_nombre.add(indice)
        conjunto = frozenset(cols or ())
        if parcial:
            t.arbitros_parciales.add(conjunto)
            continue
        t.arbitros.add(conjunto)
        if es_pk:
            t.pk = conjunto

    cursor.execute(_SQL_TRIGGERS)
    for (relname,) in cursor.fetchall():
        tabla(relname).triggers_insert = True

    return esquema


# ═══════════════════════════════ C. motor de comparacion

@dataclass(frozen=True)
class Hallazgo:
    clase: str
    tabla: str
    columnas: tuple
    fichero: str
    motivo: str

    def __str__(self) -> str:
        return f"[{self.clase}] {self.tabla}({', '.join(self.columnas)}) · {self.fichero} · {self.motivo}"


def comparar(writers: list, esquema: dict) -> list:
    fuera = []
    for w in writers:
        t = esquema.get(w.tabla)
        if t is None:
            continue  # tabla ausente del esquema publico: fuera del alcance

        if w.conflict_por_constraint:
            if w.conflict_por_constraint not in t.arbitros_por_nombre:
                fuera.append(Hallazgo(
                    ON_CONFLICT_DRIFT, w.tabla, (w.conflict_por_constraint,), w.fichero,
                    "ON CONFLICT ON CONSTRAINT sin constraint de ese nombre"))
        elif w.conflict_target is not None:
            total = w.conflict_target in t.arbitros
            # Un indice parcial cuenta SOLO si la sentencia repite su predicado.
            # Lo contrario tambien es un hallazgo: apuntar a un indice parcial sin
            # WHERE es un INSERT que PostgreSQL rechaza en produccion y que SQLite
            # acepta sin rechistar.
            parcial = w.conflict_target in t.arbitros_parciales
            if not total and not (parcial and w.conflict_con_predicado):
                disponibles = sorted(tuple(sorted(a)) for a in t.arbitros)
                motivo = (
                    "apunta a un indice unico PARCIAL sin repetir su predicado "
                    "(`ON CONFLICT (...) WHERE ...`): PostgreSQL lo rechaza"
                    if parcial else
                    f"sin PK/UNIQUE con ese conjunto exacto; "
                    f"disponibles: {disponibles or 'ninguno'}")
                fuera.append(Hallazgo(
                    ON_CONFLICT_DRIFT, w.tabla, tuple(sorted(w.conflict_target)),
                    w.fichero, motivo))

        for col in sorted(t.not_null_sin_relleno - w.columnas):
            if t.triggers_insert:
                fuera.append(Hallazgo(
                    UNRESOLVED, w.tabla, (col,), w.fichero,
                    "NOT NULL sin relleno, pero la tabla tiene trigger BEFORE INSERT: "
                    "no se puede demostrar si lo rellena"))
            elif col in t.pk:
                fuera.append(Hallazgo(
                    PRIMARY_KEY_DRIFT, w.tabla, (col,), w.fichero,
                    "forma parte de la PRIMARY KEY y el writer no la proporciona: "
                    "la identidad de la tabla es inalcanzable"))
            else:
                fuera.append(Hallazgo(
                    NOT_NULL_DRIFT, w.tabla, (col,), w.fichero,
                    "NOT NULL sin DEFAULT/GENERATED/IDENTITY y el writer no la proporciona"))
    return fuera
