"""Clasifica las tablas de inquilino sin RLS. Solo LEE: no cambia nada.

QUE PREGUNTA RESPONDE, TABLA POR TABLA
--------------------------------------
    ¿tiene datos?          una tabla vacia se puede proteger sin riesgo de
                           romper una consulta que hoy devuelve algo
    ¿quien la lee?         rutas HTTP: si ninguna la toca, protegerla no puede
                           romper una pantalla
    ¿quien la escribe?     una politica de INSERT mal puesta bloquea escrituras
                           que hoy funcionan
    ¿la usa un barrido?    `nelvyon_jobs` tiene BYPASSRLS: RLS no le afecta, pero
                           si sus consultas no filtran, el riesgo sigue
    ¿tiene FK al workspace? si la tiene, la politica es directa; si no, hay que
                           mirar como se relaciona
    ¿que rol la alcanza?   sin GRANT no hay riesgo por ese rol

EL RIESGO NO ES EL MISMO PARA TODAS
-----------------------------------
Una tabla vacia, sin rutas y sin escrituras es un lote de riesgo cero. Una con
datos, leida por seis rutas y escrita por un worker es otra conversacion. El
orden de los lotes sale de aqui, no de la intuicion.
"""
from __future__ import annotations

import asyncio
import json
import os
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[1]
BACKEND = RAIZ / "backend"

_SQL_CANDIDATAS = """
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS politicas,
       EXISTS (SELECT 1 FROM pg_constraint fk
                WHERE fk.conrelid = c.oid AND fk.contype = 'f'
                  AND EXISTS (SELECT 1 FROM pg_attribute a
                               WHERE a.attrelid = c.oid
                                 AND a.attnum = ANY(fk.conkey)
                                 AND a.attname = 'workspace_id')) AS fk_workspace,
       (SELECT string_agg(DISTINCT g.grantee, ',' ORDER BY g.grantee)
          FROM information_schema.role_table_grants g
         WHERE g.table_name = c.relname
           AND g.grantee IN ('nelvyon_app','nelvyon_jobs')) AS roles
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
   AND NOT c.relrowsecurity
   AND EXISTS (SELECT 1 FROM information_schema.columns col
                WHERE col.table_schema='public' AND col.table_name=c.relname
                  AND col.column_name='workspace_id')
 ORDER BY c.relname
"""


def _fuentes() -> dict[str, str]:
    """Todo el codigo que podria tocar una tabla, por fichero."""
    fuera: dict[str, str] = {}
    for carpeta in ("routers", "services", "core", "models"):
        d = BACKEND / carpeta
        if not d.exists():
            continue
        for f in d.rglob("*.py"):
            try:
                fuera[str(f.relative_to(BACKEND))] = f.read_text(
                    encoding="utf-8", errors="replace")
            except OSError:
                pass
    return fuera


def _consumidores(tabla: str, fuentes: dict[str, str]) -> dict[str, list[str]]:
    """Quien lee y quien escribe esta tabla, por fichero."""
    lee = re.compile(rf"\b(FROM|JOIN)\s+(?:public\.)?{tabla}\b", re.IGNORECASE)
    escribe = re.compile(
        rf"\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?{tabla}\b",
        re.IGNORECASE)
    # El ORM tambien cuenta: `class X(Base): __tablename__ = "tabla"`.
    modelo = re.compile(rf'__tablename__\s*=\s*["\']{tabla}["\']')

    r, w, m = [], [], []
    for fichero, texto in fuentes.items():
        if escribe.search(texto):
            w.append(fichero)
        elif lee.search(texto):
            r.append(fichero)
        if modelo.search(texto):
            m.append(fichero)
    return {"lee": sorted(r), "escribe": sorted(w), "modelo": sorted(m)}


def _riesgo(fila: dict) -> tuple[str, str]:
    """Clasifica el lote al que pertenece y por que.

    El criterio es cuanto puede ROMPER protegerla, no cuanto importa la tabla:
    lo segundo decide la prioridad, lo primero decide el orden seguro.
    """
    vacia = fila["filas"] == 0
    sin_rutas = not fila["lee"] and not fila["escribe"]
    sin_escrituras = not fila["escribe"]

    if vacia and sin_rutas:
        return ("A", "vacia y sin codigo que la toque: protegerla no puede "
                     "romper nada observable")
    if vacia and sin_escrituras:
        return ("B", "vacia y solo de lectura: una politica de SELECT no puede "
                     "bloquear escrituras que hoy funcionan")
    if vacia:
        return ("C", "vacia pero con escrituras: hay que acertar la politica de "
                     "INSERT antes de activarla")
    if sin_rutas:
        return ("D", "con datos y sin codigo que la toque: revisar si es legado "
                     "antes de protegerla")
    return ("E", "con datos y con codigo activo: el lote que exige mas cuidado")


async def main() -> int:
    import asyncpg

    dsn = (os.environ.get("NELVYON_PG_CERT_DSN")
           or os.environ.get("DATABASE_PUBLIC_URL") or "")
    if not dsn:
        print("Falta NELVYON_PG_CERT_DSN o DATABASE_PUBLIC_URL", file=sys.stderr)
        return 2
    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

    c = await asyncpg.connect(dsn, timeout=30)
    try:
        candidatas = [dict(r) for r in await c.fetch(_SQL_CANDIDATAS)]
        for f in candidatas:
            f["filas"] = await c.fetchval(f'SELECT count(*) FROM "{f["tabla"]}"')
    finally:
        await c.close()

    fuentes = _fuentes()
    for f in candidatas:
        f.update(_consumidores(f["tabla"], fuentes))
        f["lote"], f["motivo"] = _riesgo(f)

    por_lote: dict[str, list[dict]] = {}
    for f in candidatas:
        por_lote.setdefault(f["lote"], []).append(f)

    print(f"TABLAS DE INQUILINO SIN RLS: {len(candidatas)}\n")
    for lote in sorted(por_lote):
        filas = por_lote[lote]
        print(f"── LOTE {lote} ({len(filas)}) — {filas[0]['motivo']}")
        for f in filas[:60]:
            print(f"   {f['tabla']:38} filas={f['filas']:<7} "
                  f"lee={len(f['lee'])} escribe={len(f['escribe'])} "
                  f"fk_ws={'si' if f['fk_workspace'] else 'no':<3} "
                  f"roles={f['roles'] or '-'}")
        if len(filas) > 60:
            print(f"   ... y {len(filas) - 60} mas")
        print()

    destino = RAIZ / "docs" / "evidence" / "aislamiento_tablas_sin_rls.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(candidatas, indent=2, default=str,
                                  ensure_ascii=False), encoding="utf-8")
    print(f"detalle: {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
