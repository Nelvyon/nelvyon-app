"""Reconstruye una base virgen con la semantica REAL del runner. Version corregida."""
import collections
import io
import json
import pathlib
import sys

import psycopg2

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cortar import sentencias  # noqa: E402

MIGRACIONES = pathlib.Path(r"C:\Users\Daniel\nelvyon-w3\backend\db\migrations")
CONSOLIDADA = "507_fastapi_runtime_schemas.sql"
TOLERADOS = {"42601", "42701", "42703", "42710", "42830", "42883", "42P01", "42P16"}
BASE = "postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/"
SALIDA = pathlib.Path(__file__).parent


def main(db: str) -> None:
    conn = psycopg2.connect(BASE + db)
    conn.autocommit = True
    cur = conn.cursor()
    duros, tolerados = [], []
    ficheros = sorted(MIGRACIONES.glob("*.sql"), key=lambda p: p.name)
    for f in ficheros:
        sql = io.open(f, encoding="utf-8", errors="replace").read()
        if f.name == CONSOLIDADA:
            for st in sentencias(sql):
                try:
                    cur.execute(st)
                except psycopg2.Error as e:
                    code = e.pgcode or ""
                    reg = {"codigo": code, "sql": " ".join(st.split())[:110],
                           "msg": str(e).splitlines()[0][:80]}
                    (tolerados if code in TOLERADOS else duros).append(reg)
        else:
            try:
                cur.execute(sql)
            except psycopg2.Error as e:
                duros.append({"fichero": f.name, "codigo": e.pgcode,
                              "msg": str(e).splitlines()[0][:80]})
    cur.execute("SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                "WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1")
    tablas = [r[0] for r in cur.fetchall()]
    conn.close()

    print(f"migraciones ejecutadas         : {len(ficheros)}")
    print(f"fallos DUROS                   : {len(duros)}")
    for d in duros[:8]:
        print(f"   {d}")
    print(f"sentencias TOLERADAS en la 507 : {len(tolerados)}")
    print("   por codigo:", dict(collections.Counter(t["codigo"] for t in tolerados)))
    print(f"tablas creadas                 : {len(tablas)}")
    io.open(SALIDA / "virgen2_tablas.txt", "w", encoding="utf-8").write("\n".join(tablas))
    io.open(SALIDA / "virgen2_toleradas.json", "w", encoding="utf-8").write(
        json.dumps(tolerados, indent=1))


main(sys.argv[1] if len(sys.argv) > 1 else "nelvyon_v4")
