"""Columnas que el codigo escribe y que una recuperacion desde cero no tendria.

EL PROBLEMA QUE BUSCA
---------------------
`Base.metadata.create_all` corre en cada arranque y crea lo que falte segun los
modelos. Eso TAPA los huecos de la cadena de migraciones: produccion acaba
teniendo columnas que ninguna migracion crea, el codigo las usa sin problema, y
nadie se entera —hasta el dia que hay que restaurar desde cero y el INSERT falla
con «column does not exist».

Ya aparecio uno real: `web_performance_service` escribe `message` y `metadata` en
`security_events`, y la cadena oficial produce esa tabla sin esas dos columnas.

COMO SE MIDE
------------
Se extraen los pares (tabla, columna) de los `INSERT INTO ... (...)` del codigo y
se contrastan con el esquema de una base VIRGEN reconstruida solo con las
migraciones. Nada de modelos ni de produccion: la pregunta es «si restauramos
hoy, ¿funciona el codigo?».

Uso:
    python huecos_de_recuperacion.py <base_virgen>
"""
import io
import pathlib
import re
import sys

import psycopg2

RAIZ = pathlib.Path(__file__).resolve().parents[3]
BASE = "postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/"
EXCLUIDOS = ("node_modules", "__tests__", ".test.", ".spec.", "\\tests\\", "/tests/",
             "alembic", "migrations", "\\scripts\\", "/scripts/")

#: `INSERT INTO tabla (col, col, ...)`. Se exige la lista de columnas explicita:
#: un `INSERT INTO t VALUES (...)` sin lista no dice que columnas toca.
INSERCION = re.compile(
    r"INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([^)]{2,2000})\)",
    re.I | re.S)

#: Palabras que aparecen en una lista de columnas sin ser columnas.
NO_ES_COLUMNA = {"select", "values", "on", "conflict", "do", "update", "set",
                 "where", "returning", "as", "from", "case", "when", "then",
                 "else", "end", "and", "or", "not", "null", "true", "false"}


def _sin_comentarios(texto: str, es_python: bool) -> str:
    """Sin comentarios, y sin comerse `https://`.

    Un comentario SQL empieza por `--`; uno de Python por `#`. Y el `//` de una
    URL no abre comentario: borrar desde ahi se lleva la linea entera y con ella
    la senal que se busca.
    """
    fuera = []
    for linea in texto.splitlines():
        sin_sql = re.sub(r"--[^\n]*$", "", linea)
        if es_python:
            sin_sql = re.sub(r"(?<!:)#.*$", "", sin_sql)
        else:
            sin_sql = re.sub(r"(?<!:)//.*$", "", sin_sql)
        fuera.append(sin_sql)
    return "\n".join(fuera)


def _columnas_de(lista: str):
    for bruto in lista.split(","):
        col = bruto.strip().strip('"').lower()
        col = re.sub(r"^[a-z_][a-z0-9_]*\.", "", col)          # `t.col` -> `col`
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", col):
            continue
        if col in NO_ES_COLUMNA:
            continue
        yield col


def esquema_virgen(db: str) -> dict:
    conn = psycopg2.connect(BASE + db)
    cur = conn.cursor()
    cur.execute("""
        SELECT c.relname, a.attname
          FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
           AND a.attnum > 0 AND NOT a.attisdropped""")
    esquema = {}
    for tabla, col in cur.fetchall():
        esquema.setdefault(tabla, set()).add(col)
    conn.close()
    return esquema


def main() -> None:
    esquema = esquema_virgen(sys.argv[1])
    huecos, revisados = [], 0

    for base in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        for ext in ("*.py", "*.ts", "*.tsx"):
            for f in base.rglob(ext):
                if any(x in str(f) for x in EXCLUIDOS):
                    continue
                cuerpo = _sin_comentarios(
                    io.open(f, encoding="utf-8", errors="replace").read(),
                    f.suffix == ".py")
                for tabla, lista in INSERCION.findall(cuerpo):
                    tabla = tabla.lower()
                    if tabla not in esquema:
                        continue   # tabla desconocida: otro problema, no este
                    revisados += 1
                    faltan = sorted(c for c in _columnas_de(lista)
                                    if c not in esquema[tabla])
                    if faltan:
                        huecos.append((f.relative_to(RAIZ).as_posix(), tabla, faltan))

    print(f"inserciones contrastadas contra el esquema virgen : {revisados}")
    print(f"con columnas que la recuperacion NO tendria       : {len(huecos)}")
    for fichero, tabla, faltan in sorted(set(map(lambda h: (h[0], h[1], tuple(h[2])), huecos))):
        print(f"   {tabla}.{list(faltan)}  <-  {fichero}")


if __name__ == "__main__":
    main()
