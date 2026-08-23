"""Reconstruye una base virgen con la MISMA semantica que el runner de produccion.

La medicion anterior uso `psql -v ON_ERROR_STOP=1`, que es mas estricto que el
runner: `migrate.ts` trata la 507 sentencia a sentencia tolerando ocho codigos de
error, y el resto de migraciones de golpe. Medir con otra semantica da otro
numero, y el numero que importa es el que produciria un despliegue de verdad.
"""
import io
import pathlib
import re
import sys

import psycopg2

MIGRACIONES = pathlib.Path(r"C:\Users\Daniel\nelvyon-w3\backend\db\migrations")
CONSOLIDADA = "507_fastapi_runtime_schemas.sql"
TOLERADOS = {"42601", "42701", "42703", "42710", "42830", "42883", "42P01", "42P16"}
DSN = "postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_v3"


def sentencias(sql: str):
    """Corte por `;` respetando $$...$$ y cadenas: lo que hace splitSqlStatements."""
    fuera, actual, i, n = [], [], 0, len(sql)
    dolar = None
    while i < n:
        c = sql[i]
        if dolar:
            if sql.startswith(dolar, i):
                actual.append(dolar); i += len(dolar); dolar = None; continue
        else:
            m = re.match(r"\$[a-zA-Z_]*\$", sql[i:])
            if m:
                dolar = m.group(0); actual.append(dolar); i += len(dolar); continue
            if c == "'":
                j = sql.find("'", i + 1)
                while j != -1 and j + 1 < n and sql[j + 1] == "'":
                    j = sql.find("'", j + 2)
                j = n if j == -1 else j
                actual.append(sql[i:j + 1]); i = j + 1; continue
            if c == ";":
                fuera.append("".join(actual)); actual = []; i += 1; continue
        actual.append(c); i += 1
    if "".join(actual).strip():
        fuera.append("".join(actual))
    return [s for s in (x.strip() for x in fuera) if s and not s.startswith("--")]


def main() -> None:
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    cur = conn.cursor()
    duros, tolerados_total = [], 0
    ficheros = sorted(MIGRACIONES.glob("*.sql"), key=lambda p: p.name)
    for f in ficheros:
        sql = io.open(f, encoding="utf-8", errors="replace").read()
        if f.name == CONSOLIDADA:
            for st in sentencias(sql):
                try:
                    cur.execute(st)
                except psycopg2.Error as e:
                    if (e.pgcode or "") in TOLERADOS:
                        tolerados_total += 1
                    else:
                        duros.append((f.name, e.pgcode, str(e).splitlines()[0][:80]))
        else:
            try:
                cur.execute(sql)
            except psycopg2.Error as e:
                duros.append((f.name, e.pgcode, str(e).splitlines()[0][:80]))
    cur.execute("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                "WHERE n.nspname='public' AND c.relkind='r'")
    tablas = cur.fetchone()[0]
    conn.close()

    print(f"migraciones ejecutadas          : {len(ficheros)}")
    print(f"sentencias TOLERADAS en la 507  : {tolerados_total}")
    print(f"fallos DUROS                    : {len(duros)}")
    print(f"tablas creadas                  : {tablas}")
    for f, code, msg in duros[:12]:
        print(f"   {f} [{code}] {msg}")


main()
