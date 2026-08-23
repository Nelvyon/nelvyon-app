"""Catalogo SEMANTICO de una base: lo que hay que comparar, no solo los nombres.

Comparar recuentos de tablas no certifica nada. Dos bases pueden tener las mismas
712 tablas y aun asi comportarse distinto porque a una le falta una restriccion
`NOT NULL`, un indice unico, una politica de RLS o el `FORCE ROW LEVEL SECURITY`
que hace que la politica se aplique tambien al dueno de la tabla.

Se extrae:

    tablas · columnas (tipo, nulabilidad, default) · PK · FK (con su accion)
    · restricciones CHECK y UNIQUE · indices · funciones · triggers
    · `relrowsecurity` y `relforcerowsecurity` · politicas (con su expresion)

Uso:
    python catalogo_semantico.py <nombre_de_base> [fichero_de_salida.json]
"""
import io
import json
import pathlib
import sys

import psycopg2

BASE = "postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/"

#: Cada dimension, con la consulta que la mide. Se guardan ORDENADAS para que dos
#: extracciones de la misma base den exactamente el mismo fichero: si el orden
#: variara, cualquier comparacion posterior senalaria diferencias inventadas.
CONSULTAS = {
    "columnas": """
        SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod),
               a.attnotnull, COALESCE(pg_get_expr(d.adbin, d.adrelid), '')
          FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY 1, 2""",

    "restricciones": """
        SELECT c.relname, con.conname, con.contype,
               pg_get_constraintdef(con.oid)
          FROM pg_constraint con
          JOIN pg_class c ON c.oid = con.conrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
         ORDER BY 1, 2""",

    "indices": """
        SELECT tablename, indexname, indexdef
          FROM pg_indexes WHERE schemaname = 'public'
         ORDER BY 1, 2""",

    "funciones": """
        SELECT p.proname, pg_get_function_identity_arguments(p.oid),
               pg_get_function_result(p.oid), p.prosecdef
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
         ORDER BY 1, 2""",

    "disparadores": """
        SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid)
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND NOT t.tgisinternal
         ORDER BY 1, 2""",

    "rls": """
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
         ORDER BY 1""",

    "politicas": """
        SELECT tablename, policyname, cmd, roles::text,
               COALESCE(qual, ''), COALESCE(with_check, '')
          FROM pg_policies WHERE schemaname = 'public'
         ORDER BY 1, 2""",
}


def extraer(db: str) -> dict:
    conn = psycopg2.connect(BASE + db)
    cur = conn.cursor()
    salida = {}
    for nombre, sql in CONSULTAS.items():
        cur.execute(sql)
        salida[nombre] = [list(map(_texto, fila)) for fila in cur.fetchall()]
    conn.close()
    return salida


def _texto(v):
    """Todo a texto: `True` y `'t'` son el mismo dato escrito de dos formas."""
    if isinstance(v, bool):
        return "t" if v else "f"
    return "" if v is None else str(v)


def main() -> None:
    db = sys.argv[1]
    destino = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
    cat = extraer(db)
    for nombre, filas in cat.items():
        print(f"   {nombre:15} {len(filas):6}")
    # `relrowsecurity` sin politicas es una tabla que rechaza a todo el mundo;
    # politicas sin `relrowsecurity` es una tabla que no protege a nadie. Las dos
    # se ven aqui y ninguna se ve contando tablas.
    con_rls = {f[0] for f in cat["rls"] if f[1] == "t"}
    forzada = {f[0] for f in cat["rls"] if f[2] == "t"}
    con_politica = {f[0] for f in cat["politicas"]}
    print(f"   tablas con RLS activo    : {len(con_rls)}")
    print(f"   de esas, con FORCE       : {len(forzada)}")
    print(f"   RLS activo SIN politica  : {len(con_rls - con_politica)}")
    print(f"   politica SIN RLS activo  : {len(con_politica - con_rls)}")
    if destino:
        io.open(destino, "w", encoding="utf-8").write(
            json.dumps(cat, indent=1, sort_keys=True, ensure_ascii=False))
        print(f"   escrito: {destino}")


if __name__ == "__main__":
    main()
