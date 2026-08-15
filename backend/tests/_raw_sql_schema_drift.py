"""
Divergencia entre el SQL crudo de los servicios y el esquema que existe.

POR QUE
-------
Varios servicios FastAPI escriben con SQL literal y no tienen modelo
SQLAlchemy, asi que `Base.metadata.create_all` no los cubre y su esquema
depende solo de migraciones. Cuando ambas cosas divergen el fallo aparece en
runtime como `column ... does not exist` y el endpoint devuelve 500.

Ya ocurrio con `intent_events.lead_id`, `email_warmup_accounts.domain` y otras:
la migracion 507 se escribio seis semanas DESPUES de los servicios y transcribio
nombres distintos. Nada lo detectaba.

ALCANCE DELIBERADO
------------------
SQL literal y estatico. No se intenta interpretar SQL construido
dinamicamente: un parser a medias daria una falsa sensacion de cobertura. Lo que
no se puede leer con certeza se marca como no analizable, no como correcto.

Solo biblioteca estandar: `re`, `ast`, `pathlib`.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MIGRACIONES = RAIZ / "db" / "migrations"
DIRS_PYTHON = ("services", "core", "routers", "agents")

# ─────────────────────────────────────────────────────────── esquema efectivo

_CREATE_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?P<table>[a-z_][a-z0-9_]*)\s*\((?P<body>.*?)\n\s*\);",
    re.IGNORECASE | re.DOTALL,
)
_ADD_COL_RE = re.compile(
    r"ALTER\s+TABLE\s+(?:ONLY\s+)?(?P<table>[a-z_][a-z0-9_]*)\s+"
    r"ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?P<column>[a-z_][a-z0-9_]*)",
    re.IGNORECASE,
)
#: Palabras que abren una restriccion, no una columna.
_NO_ES_COLUMNA = {
    "primary", "foreign", "unique", "check", "constraint", "exclude", "like", "index",
}


def _columnas_de_create(body: str) -> set[str]:
    cols: set[str] = set()
    profundidad = 0
    actual: list[str] = []
    for ch in body + ",":
        if ch == "(":
            profundidad += 1
        elif ch == ")":
            profundidad -= 1
        if ch == "," and profundidad == 0:
            trozo = "".join(actual).strip()
            actual = []
            if not trozo:
                continue
            primera = trozo.split()[0].strip('"').lower()
            if primera and primera not in _NO_ES_COLUMNA and re.fullmatch(r"[a-z_][a-z0-9_]*", primera):
                cols.add(primera)
            continue
        actual.append(ch)
    return cols


def esquema_de_migraciones() -> dict[str, set[str]]:
    """tabla -> columnas, agregando TODAS las migraciones en orden."""
    esquema: dict[str, set[str]] = {}
    for fichero in sorted(MIGRACIONES.glob("*.sql")):
        sql = fichero.read_text(encoding="utf-8", errors="ignore")
        for m in _CREATE_RE.finditer(sql):
            esquema.setdefault(m.group("table").lower(), set()).update(
                _columnas_de_create(m.group("body"))
            )
        for m in _ADD_COL_RE.finditer(sql):
            esquema.setdefault(m.group("table").lower(), set()).add(m.group("column").lower())

    # La migracion 533 anade `workspace_id` con `EXECUTE format(...)` dentro de
    # un bloque `DO`, que ningun regex puede leer sin ejecutar SQL. Se declara
    # desde la misma lista que usa el bootstrap de tests, para que las dos no
    # puedan separarse.
    from tests._schema_bootstrap import TABLAS_CON_WORKSPACE_ANADIDO

    for tabla in TABLAS_CON_WORKSPACE_ANADIDO:
        esquema.setdefault(tabla, set()).add("workspace_id")
    return esquema


def esquema_de_modelos() -> dict[str, set[str]]:
    """tabla -> columnas declaradas por modelos SQLAlchemy, por AST.

    Se lee estaticamente para no importar la aplicacion entera.
    """
    import ast

    esquema: dict[str, set[str]] = {}
    for fichero in sorted((RAIZ / "models").glob("*.py")):
        try:
            arbol = ast.parse(fichero.read_text(encoding="utf-8", errors="ignore"))
        except SyntaxError:
            continue
        for nodo in ast.walk(arbol):
            if not isinstance(nodo, ast.ClassDef):
                continue
            tabla = None
            cols: set[str] = set()
            for cuerpo in nodo.body:
                if isinstance(cuerpo, ast.Assign) and cuerpo.targets:
                    destino = cuerpo.targets[0]
                    if isinstance(destino, ast.Name):
                        if destino.id == "__tablename__" and isinstance(cuerpo.value, ast.Constant):
                            tabla = str(cuerpo.value.value)
                        elif isinstance(cuerpo.value, ast.Call):
                            fn = cuerpo.value.func
                            nombre = fn.id if isinstance(fn, ast.Name) else getattr(fn, "attr", "")
                            if nombre in ("Column", "mapped_column"):
                                cols.add(destino.id.lower())
            if tabla:
                esquema.setdefault(tabla.lower(), set()).update(cols)
    return esquema


def esquema_efectivo() -> dict[str, set[str]]:
    """Union de ambas fuentes.

    Una tabla sin modelo depende solo de migraciones; una con modelo puede
    recibir columnas por cualquiera de las dos vias, asi que la union es la
    lectura correcta: preguntamos "¿existe esta columna en algun sitio?".
    """
    esquema = esquema_de_migraciones()
    for tabla, cols in esquema_de_modelos().items():
        esquema.setdefault(tabla, set()).update(cols)
    return esquema


# ──────────────────────────────────────────────────────────── SQL de servicios

_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+(?P<table>[a-z_][a-z0-9_]*)\s*\((?P<cols>[^)]*)\)", re.IGNORECASE
)
_UPDATE_RE = re.compile(
    r"UPDATE\s+(?P<table>[a-z_][a-z0-9_]*)\s+SET\s+(?P<sets>.*?)(?:\bWHERE\b|\bRETURNING\b|\"\"\"|$)",
    re.IGNORECASE | re.DOTALL,
)
_ASIGNACION_RE = re.compile(r"(?:^|,)\s*(?P<col>[a-z_][a-z0-9_]*)\s*=", re.IGNORECASE)


@dataclass(frozen=True)
class UsoDeColumna:
    tabla: str
    columna: str
    tipo: str  # INSERT | UPDATE | SELECT | ORDER BY | GROUP BY
    fichero: str


_SELECT_COLS_RE = re.compile(r"SELECT\s+(?P<cols>.+?)\s+FROM\s", re.IGNORECASE | re.DOTALL)
_ORDER_GROUP_RE = re.compile(r"(?P<clausula>ORDER\s+BY|GROUP\s+BY)\s+(?P<cols>[^\n;)]+)", re.IGNORECASE)
_FROM_RE = re.compile(r"\bFROM\s+(?P<table>[a-z_][a-z0-9_]*)", re.IGNORECASE)
_JOIN_RE = re.compile(r"\bJOIN\b", re.IGNORECASE)
#: Acompanan a la columna en una ordenacion; no son columnas.
_RUIDO = {"asc", "desc", "nulls", "last", "first", "limit", "offset", "count", "sum", "avg", "min", "max"}



#: Palabras de expresion y funciones: nunca son columnas.
_PALABRAS_SQL = {
    "case", "when", "then", "else", "end", "distinct", "as", "on", "and", "or",
    "not", "null", "is", "in", "like", "between", "cast", "coalesce", "date",
    "extract", "interval", "now", "current_date", "current_timestamp",
    # Literales booleanos: `SELECT true, false` los tomaba por columnas.
    "true", "false", "unknown",
}
_ALIAS_RE = re.compile(r"(?P<expr>.+?)" + chr(92) + "s+AS" + chr(92) + "s+(?P<alias>[a-z_][a-z0-9_]*)" + chr(92) + "s*$", re.IGNORECASE)


def _alias_de_proyeccion(sql: str) -> set[str]:
    """Alias declarados en el SELECT (`... AS cnt`).

    Una referencia posterior en ORDER BY/GROUP BY a uno de estos nombres apunta
    a la proyeccion, no a una columna de la tabla: tratarla como columna generaba
    falsos positivos (`cnt`, `qty`, `day`, `ticket_count`).
    """
    alias: set[str] = set()
    for m in _SELECT_COLS_RE.finditer(sql):
        for bruto in _divide_por_comas(m.group("cols")):
            a = _ALIAS_RE.match(bruto.strip())
            if a:
                alias.add(a.group("alias").lower())
    return alias


def _divide_por_comas(texto: str) -> list[str]:
    """Divide por comas de nivel superior: `COUNT(a, b)` no son dos columnas."""
    partes, prof, actual = [], 0, []
    for ch in texto + ",":
        if ch == "(":
            prof += 1
        elif ch == ")":
            prof -= 1
        if ch == "," and prof == 0:
            partes.append("".join(actual))
            actual = []
            continue
        actual.append(ch)
    return [p for p in partes if p.strip()]


def _limpia(bruto: str) -> str:
    t = bruto.strip()
    if not t:
        return ""
    t = t.split()[0]          # descarta ASC/DESC y alias
    t = t.split(".")[-1]      # tabla.col -> col
    return t.strip('"').lower()


def analizar_sql(sql: str, fichero: str = "<fixture>") -> tuple[list[UsoDeColumna], list[UsoDeColumna]]:
    """Analiza UNA sentencia SQL literal.

    Devuelve `(usos_resueltos, no_resueltos)`. Es una funcion pura para que el
    detector pueda probarse con fixtures controladas: un escaner que devuelve
    cero hallazgos no esta validado hasta demostrar un positivo conocido, y
    depender solo del repo real fue exactamente lo que oculto que la deteccion
    de lecturas no funcionaba.
    """
    usos: list[UsoDeColumna] = []
    sin_resolver: list[UsoDeColumna] = []

    for m in _INSERT_RE.finditer(sql):
        tabla = m.group("table").lower()
        for bruto in m.group("cols").split(","):
            col = _limpia(bruto)
            if re.fullmatch(r"[a-z_][a-z0-9_]*", col or ""):
                usos.append(UsoDeColumna(tabla, col, "INSERT", fichero))

    for m in _UPDATE_RE.finditer(sql):
        tabla = m.group("table").lower()
        for a in _ASIGNACION_RE.finditer(m.group("sets")):
            usos.append(UsoDeColumna(tabla, a.group("col").lower(), "UPDATE", fichero))

    # ── lecturas ────────────────────────────────────────────────────────────
    tablas = _FROM_RE.findall(sql)
    ambiguo = bool(_JOIN_RE.search(sql)) or len(set(t.lower() for t in tablas)) != 1
    tabla = None if ambiguo else tablas[0].lower()

    alias = _alias_de_proyeccion(sql)

    motivo = (
        "join_ambiguo" if _JOIN_RE.search(sql)
        else "sin_from" if not tablas
        else "multiples_from" if len(set(t.lower() for t in tablas)) > 1
        else "otro"
    )

    def registra(col: str, tipo: str) -> None:
        # Ordinales (`ORDER BY 1`), palabras de expresion y alias de proyeccion
        # no son columnas de la tabla.
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", col or ""):
            return
        if col in _RUIDO or col in _PALABRAS_SQL or col in alias:
            return
        if tabla is None:
            sin_resolver.append(UsoDeColumna(motivo, col, tipo, fichero))
        else:
            usos.append(UsoDeColumna(tabla, col, tipo, fichero))

    for m in _SELECT_COLS_RE.finditer(sql):
        cols = m.group("cols")
        # Solo un `*` DESNUDO impide inferir. `COUNT(*)` contiene un asterisco y
        # descartaba la proyeccion entera, ocultando columnas reales a su lado.
        if any(t.strip() in ("*",) or t.strip().endswith(".*") for t in _divide_por_comas(cols)):
            continue
        for bruto in _divide_por_comas(cols):
            if "(" in bruto:
                continue  # expresion/funcion: no es una columna literal
            registra(_limpia(bruto), "SELECT")

    for m in _ORDER_GROUP_RE.finditer(sql):
        clausula = re.sub(r"\s+", " ", m.group("clausula")).upper()
        for bruto in _divide_por_comas(m.group("cols")):
            if "(" in bruto or re.search(r"(?i)" + chr(92) + "bCASE" + chr(92) + "b", bruto):
                continue  # expresion: sus columnas internas no se atribuyen a ciegas
            registra(_limpia(bruto), clausula)

    return usos, sin_resolver


def _sql_literales(fichero: Path) -> list[str]:
    """Strings constantes del fichero, via AST.

    Se usa AST y no regex sobre el codigo: buscar delimitadores de triple comilla
    con expresiones regulares es justo lo que fallaba, porque el SQL puede estar
    en cualquier forma de literal.
    """
    import ast

    try:
        arbol = ast.parse(fichero.read_text(encoding="utf-8", errors="ignore"))
    except SyntaxError:
        return []
    fuera: list[str] = []
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Constant) and isinstance(nodo.value, str):
            if re.search(r"\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|SELECT\b)", nodo.value, re.IGNORECASE):
                fuera.append(nodo.value)
        elif isinstance(nodo, ast.JoinedStr):  # f-string: se unen sus partes literales
            texto = "".join(v.value for v in nodo.values if isinstance(v, ast.Constant) and isinstance(v.value, str))
            if re.search(r"\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|SELECT\b)", texto, re.IGNORECASE):
                fuera.append(texto)
    return fuera


no_resueltos: list[UsoDeColumna] = []


def usos_en_sql_crudo() -> list[UsoDeColumna]:
    usos: list[UsoDeColumna] = []
    no_resueltos.clear()
    for carpeta in DIRS_PYTHON:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for fichero in sorted(base.rglob("*.py")):
            if "__pycache__" in str(fichero):
                continue
            rel = str(fichero.relative_to(RAIZ)).replace(chr(92), "/")
            for sql in _sql_literales(fichero):
                u, nr = analizar_sql(sql, rel)
                usos.extend(u)
                no_resueltos.extend(nr)
    return usos


def divergencias() -> list[UsoDeColumna]:
    """Usos cuya columna no existe en NINGUNA fuente de esquema.

    Una tabla que no aparece en el esquema se omite: puede crearse por una via
    que este analizador no cubre, y reportarla seria ruido, no senal.
    """
    esquema = esquema_efectivo()
    fuera: list[UsoDeColumna] = []
    for uso in usos_en_sql_crudo():
        cols = esquema.get(uso.tabla)
        if cols is None:
            continue
        if uso.columna not in cols:
            fuera.append(uso)
    return fuera
