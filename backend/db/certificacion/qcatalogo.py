import os
import io
import json
import asyncio
import asyncpg

SALIDA = r"C:\Users\Daniel\nelvyon-w3\backend\db\certificacion\catalogo_produccion.json"


async def main() -> None:
    c = await asyncpg.connect(os.environ["DATABASE_PUBLIC_URL"].replace("+asyncpg", ""))
    filas = await c.fetch("""
        SELECT c.relname AS tabla, a.attname AS columna
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = c.oid
         WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m','p')
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY c.relname, a.attname""")
    cat: dict[str, list[str]] = {}
    for f in filas:
        cat.setdefault(f["tabla"], []).append(f["columna"])
    migraciones = await c.fetchval("SELECT count(*) FROM _migrations")
    await c.close()

    doc = {
        "_comentario": (
            "Instantanea del catalogo de PRODUCCION. La usa "
            "`test_ninguna_consulta_cita_una_columna_que_no_existe` para detectar "
            "deriva entre el SQL del codigo y el esquema real. Se regenera con "
            "backend/db/certificacion/qcatalogo.py cuando cambie el esquema."),
        "_migraciones_aplicadas": migraciones,
        "tablas": cat,
    }
    io.open(SALIDA, "w", encoding="utf-8").write(json.dumps(doc, indent=1, sort_keys=True))
    print(f"catalogo: {len(cat)} tablas, {sum(len(v) for v in cat.values())} columnas")
    print(f"_migrations = {migraciones}")


asyncio.run(main())
