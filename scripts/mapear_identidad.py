"""Mapea los DOS espacios de identidad de inquilino. Solo lee.

QUE HAY QUE DECIDIR
-------------------
El esquema dice de quien es una fila de dos formas incompatibles:

    workspace_id  INTEGER   apunta a `workspaces.id`
    tenant_id     UUID      apunta a `saas_tenants.id` (96 claves ajenas)

Elegir el canonico no es una preferencia de estilo: hasta que se elija, la capa
de memoria de los agentes no puede funcionar —consulta con un cast a uuid y
recibe un entero— y RAG no se puede conectar encima.

QUE NECESITA SABER QUIEN DECIDA
-------------------------------
    cuantas tablas usa cada espacio, y cuantas filas tienen
    cuales usan LOS DOS a la vez, que son las que revelan como se relacionan
    que codigo escribe cada uno
    cuantas claves ajenas sostienen el espacio uuid

Este informe no decide. Reune lo que hace falta para decidir con datos.
"""
from __future__ import annotations

import asyncio
import json
import os
import pathlib
import re
import sys

# La consola de Windows usa cp1252 y estos informes llevan caracteres de dibujo.
# Sin esto el script muere con UnicodeEncodeError DESPUES de hacer todo el
# trabajo, que es la peor forma posible de fallar: parece un error de la
# consulta cuando solo es el terminal.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):  # pragma: no cover - stdout redirigido
    pass


RAIZ = pathlib.Path(__file__).resolve().parents[1]
BACKEND = RAIZ / "backend"


async def main() -> int:
    import asyncpg

    dsn = (os.environ.get("DATABASE_PUBLIC_URL")
           or os.environ.get("NELVYON_PG_CERT_DSN") or "")
    if not dsn:
        print("Falta DATABASE_PUBLIC_URL o NELVYON_PG_CERT_DSN", file=sys.stderr)
        return 2

    c = await asyncpg.connect(dsn.replace("postgresql+asyncpg://", "postgresql://"),
                              timeout=60)
    try:
        columnas = await c.fetch("""
            SELECT table_name, column_name, data_type
              FROM information_schema.columns
             WHERE table_schema = 'public'
               AND column_name IN ('workspace_id', 'tenant_id')
             ORDER BY table_name""")

        por_tabla: dict[str, dict[str, str]] = {}
        for f in columnas:
            por_tabla.setdefault(f["table_name"], {})[f["column_name"]] = f["data_type"]

        solo_ws, solo_tenant, ambos, raros = [], [], [], []
        for tabla, cols in sorted(por_tabla.items()):
            ws, te = cols.get("workspace_id"), cols.get("tenant_id")
            if ws and te:
                ambos.append((tabla, ws, te))
            elif ws:
                (solo_ws if ws == "integer" else raros).append((tabla, ws))
            elif te:
                (solo_tenant if te == "uuid" else raros).append((tabla, te))

        print(f"SOLO workspace_id INTEGER : {len(solo_ws)}")
        print(f"SOLO tenant_id UUID       : {len(solo_tenant)}")
        print(f"LAS DOS a la vez          : {len(ambos)}")
        print(f"Tipos inesperados         : {len(raros)}")

        if raros:
            print("\n── tipos que no encajan en ninguno de los dos espacios")
            for t, tipo in raros[:20]:
                print(f"   {t:40} {tipo}")

        print("\n── tablas con AMBAS columnas (revelan la relacion)")
        con_datos = []
        for tabla, ws, te in ambos[:40]:
            n = await c.fetchval(f'SELECT count(*) FROM public."{tabla}"')
            marca = f"  <-- {n} filas" if n else ""
            print(f"   {tabla:40} ws={ws:8} tenant={te}{marca}")
            if n:
                con_datos.append(tabla)

        print("\n── ¿alguna clave ajena desde tenant_id?")
        fks = await c.fetch("""
            SELECT c.conrelid::regclass::text AS tabla,
                   confrelid::regclass::text AS apunta_a
              FROM pg_constraint c
             WHERE c.contype = 'f'
               AND EXISTS (SELECT 1 FROM pg_attribute a
                            WHERE a.attrelid = c.conrelid
                              AND a.attnum = ANY(c.conkey)
                              AND a.attname = 'tenant_id')""")
        print("   " + (str([(f["tabla"], f["apunta_a"]) for f in fks]) if fks
                       else "NINGUNA clave ajena desde una columna `tenant_id`"))

        print("\n── filas reales en cada espacio")
        for etiqueta, lista in (("workspace_id", solo_ws), ("tenant_id", solo_tenant)):
            total = 0
            con = 0
            for tabla, _ in lista:
                n = await c.fetchval(f'SELECT count(*) FROM public."{tabla}"')
                total += n
                con += 1 if n else 0
            print(f"   {etiqueta:14} {con} tablas con datos, {total} filas en total")
    finally:
        await c.close()

    # Quien escribe cada espacio.
    print("\n── codigo que escribe cada espacio")
    ws_re = re.compile(r"workspace_id")
    te_re = re.compile(r"\btenant_id\b")
    solo_a, solo_b, mezcla = 0, 0, []
    for carpeta in ("routers", "services", "core"):
        d = BACKEND / carpeta
        if not d.exists():
            continue
        for f in d.rglob("*.py"):
            texto = f.read_text(encoding="utf-8", errors="replace")
            a, b = bool(ws_re.search(texto)), bool(te_re.search(texto))
            if a and b:
                mezcla.append(str(f.relative_to(BACKEND)))
            elif a:
                solo_a += 1
            elif b:
                solo_b += 1
    print(f"   solo workspace_id : {solo_a} ficheros")
    print(f"   solo tenant_id    : {solo_b} ficheros")
    print(f"   LOS DOS           : {len(mezcla)} ficheros  <-- donde se mezclan")
    for f in sorted(mezcla)[:15]:
        print(f"      {f}")
    if len(mezcla) > 15:
        print(f"      ... y {len(mezcla) - 15} mas")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
