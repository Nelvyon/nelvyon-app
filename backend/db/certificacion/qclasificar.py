"""Clasifica cada tabla NO vacia de produccion por la naturaleza de sus datos.

No borra nada. Solo mide y clasifica con evidencia, para que la limpieza futura
—si el fundador la autoriza— tenga un criterio escrito en vez de un juicio.
"""
import os
import io
import json
import asyncio
import asyncpg

SALIDA = r"C:\Users\Daniel\nelvyon-w3\backend\db\certificacion\clasificacion_datos.json"

#: Tablas del propio sistema: catalogos, migraciones, configuracion. No son ni
#: datos de cliente ni residuo de prueba.
SISTEMA = {
    "_migrations", "status_checks", "nelvyon_services", "nelvyon_service_privileges",
    "os_process_templates", "landing_templates", "os_store_templates",
    "os_website_templates", "changelog_entries", "roadmap_items",
    "nelvyon_agent_templates", "nelvyon_agent_catalog", "nelvyon_agent_capabilities",
}

#: Marcas que delatan una fila de certificacion o humo.
MARCAS = ("test", "smoke", "cert", "demo", "prueba", "qa audit", "e2e",
          "pai-", "co-wf", "co-seq", "co-st", "emu ", "nelvyon.test",
          "example.com", "certcrm", "mi workspace")


async def texto_de_muestra(c, tabla: str, cols: set[str]) -> str:
    """Concatena unas cuantas columnas de texto para buscar marcas."""
    candidatas = [x for x in ("name", "business_name", "company_name", "title",
                              "email", "to_email", "client_email", "contact_email",
                              "slug", "subject") if x in cols]
    if not candidatas:
        return ""
    expr = " || ' ' || ".join(f"COALESCE({x}::text,'')" for x in candidatas)
    filas = await c.fetch(f"SELECT {expr} AS t FROM public.{tabla} LIMIT 40")
    return " ".join((f["t"] or "").lower() for f in filas)


async def main() -> None:
    c = await asyncpg.connect(os.environ["DATABASE_PUBLIC_URL"].replace("+asyncpg", ""))
    tablas = [r["relname"] for r in await c.fetch("""
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname""")]

    resultado = {}
    resumen = {"REAL_PRODUCTION_DATA": 0, "CERTIFICATION_FIXTURE": 0,
               "SYSTEM_DATA": 0, "UNKNOWN": 0, "VACIA": 0}
    for t in tablas:
        n = await c.fetchval(f"SELECT count(*) FROM public.{t}")
        if n == 0:
            resumen["VACIA"] += 1
            continue
        cols = {r["attname"] for r in await c.fetch(
            "SELECT attname FROM pg_attribute WHERE attrelid=to_regclass($1) "
            "AND attnum>0 AND NOT attisdropped", "public." + t)}
        if t in SISTEMA:
            clase, motivo = "SYSTEM_DATA", "catalogo o configuracion del propio sistema"
        else:
            muestra = await texto_de_muestra(c, t, cols)
            marcas = sorted({m for m in MARCAS if m in muestra})
            if marcas:
                clase = "CERTIFICATION_FIXTURE"
                motivo = f"contenido con marcas de prueba: {marcas[:4]}"
            elif "workspace_id" in cols:
                ws = await c.fetch(
                    f"SELECT DISTINCT workspace_id FROM public.{t} WHERE workspace_id IS NOT NULL LIMIT 5")
                ids = sorted(r["workspace_id"] for r in ws)
                if ids and set(ids) <= {1, 2, 3}:
                    clase = "CERTIFICATION_FIXTURE"
                    motivo = (f"todas las filas en los workspaces {ids}, que son los "
                              f"tres de certificacion («Mi Workspace»)")
                else:
                    clase, motivo = "UNKNOWN", f"workspaces {ids}: no concluyente"
            else:
                clase, motivo = "UNKNOWN", "sin columna de inquilino ni marcas legibles"
        resumen[clase] += 1
        resultado[t] = {"filas": n, "clase": clase, "motivo": motivo}
    await c.close()

    print("clasificacion de las tablas CON datos:")
    for k, v in resumen.items():
        print(f"   {k:24} {v}")
    print()
    for clase in ("REAL_PRODUCTION_DATA", "UNKNOWN", "CERTIFICATION_FIXTURE", "SYSTEM_DATA"):
        items = [(t, d) for t, d in sorted(resultado.items(), key=lambda x: -x[1]["filas"])
                 if d["clase"] == clase]
        if not items:
            continue
        print(f"── {clase} ({len(items)}) ──")
        for t, d in items[:14]:
            print(f"   {t:34} {d['filas']:>6}  {d['motivo'][:66]}")
        if len(items) > 14:
            print(f"   … y {len(items)-14} mas")
        print()

    io.open(SALIDA, "w", encoding="utf-8").write(json.dumps(
        {"_comentario": "Clasificacion de los datos de produccion. NADA se ha "
                        "modificado ni borrado. Base para una limpieza futura "
                        "si el fundador la autoriza.",
         "resumen": resumen, "tablas": resultado}, indent=1, sort_keys=True))
    print("escrito clasificacion_datos.json")


asyncio.run(main())
