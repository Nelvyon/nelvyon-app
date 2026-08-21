"""La deuda de RLS no puede crecer. Solo puede bajar.

QUE SE MIDIO
------------
De 712 tablas, 169 llevan `workspace_id` —es decir, guardan datos de un
inquilino concreto— y 111 de ellas NO tienen RLS activado. En esas 111 el unico
aislamiento es que la consulta se acuerde de filtrar por `workspace_id`. Una que
se olvide devuelve datos de todos los inquilinos, sin error y sin que nada avise.

No es hipotetico: en esta misma sesion aparecio una sentencia de borrado de GDPR
sin filtro de inquilino, en un metodo donde las demas si lo llevaban.

POR QUE UN TRINQUETE Y NO UN BARRIDO
------------------------------------
Activar RLS en 111 tablas a ciegas es temerario. Cada una necesita la politica
correcta, y una politica mal escrita no «protege de mas»: rompe el producto, o
peor, deja pasar lo que deberia parar. Ademas exige una migracion por lote y
autorizacion explicita.

Lo que si se puede hacer hoy, y es lo que mas valor tiene, es impedir que la
deuda CREZCA. Una tabla nueva con `workspace_id` y sin RLS es deuda nueva creada
a sabiendas, y eso si se puede parar en el momento en que alguien la escribe.

COMO SE BAJA EL TRINQUETE
-------------------------
Protegiendo tablas y ACTUALIZANDO el numero de abajo. El trinquete solo aprieta:
si la cobertura mejora y nadie actualiza la cifra, la prueba tambien falla, para
que la mejora quede registrada en vez de perderse.
"""
from __future__ import annotations

import os
import pathlib
import re

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = [
    pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN"),
    pytest.mark.asyncio,
]

#: Tablas con `workspace_id` y SIN RLS.
#:
#: Este numero solo puede BAJAR. Si sube, alguien creo una tabla de inquilino sin
#: protegerla; si baja, hay que actualizarlo aqui para que la mejora quede fijada.
#:
#: 111 -> 91 con la migracion 560, que protegio las 20 tablas que ningun codigo
#: lee ni escribe: el lote de menor riesgo posible, elegido para demostrar el
#: mecanismo sobre algo que no podia romperse. Verificado en los dos sentidos —
#: sin RLS el vecino veia, borraba y se apropiaba de las filas ajenas.
#:
#: 91 -> 90 con la 561, que protegio `workspaces` y `workspace_members` con una
#: politica basada en USUARIO y no en workspace actual. La estandar habria dejado
#: el selector de workspaces vacio justo despues del login.
#:
#: Baja UNA y no dos aunque la 561 protegiera dos tablas: `workspaces` no tiene
#: columna `workspace_id` —ella ES el workspace— asi que nunca entro en este
#: recuento. La metrica mide «tablas que guardan datos DE un inquilino», y esa
#: guarda al inquilino mismo. Se deja asi a proposito: cambiar la definicion para
#: incluirla haria incomparables todas las mediciones anteriores.
#:
#: 90 -> 81 con la 562, las nueve tablas cuyos escritores son siempre rutas
#: autenticadas. Guardan oportunidades, contratos, conversaciones, citas e
#: ingresos: sin RLS, una consulta que olvidara el filtro devolvia la cartera
#: comercial de TODOS los inquilinos.
#:
#: 81 -> 35 con la 563, medida ya contra PRODUCCION y no contra certificacion:
#: la base de certificacion habia divergido y ocho tablas que alli estaban
#: vacias tenian datos en produccion, una con 14.178 filas. Las guardas
#: fail-closed las omiten en vez de ocultarle datos a quien hoy los ve.
DEUDA_MAXIMA = 35

#: Margen cero a proposito. Un trinquete con holgura deja de ser un trinquete: la
#: holgura se consume y nadie se entera.

_RAIZ = pathlib.Path(__file__).resolve().parents[1]

_SQL_DEUDA = """
SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relkind = 'r'
   AND NOT c.relrowsecurity
   AND EXISTS (SELECT 1 FROM information_schema.columns col
                WHERE col.table_schema = 'public'
                  AND col.table_name = c.relname
                  AND col.column_name = 'workspace_id')
 ORDER BY 1
"""


async def _deuda(conexion) -> list[str]:
    return [r["relname"] for r in await conexion.fetch(_SQL_DEUDA)]


@pytest.fixture
async def conexion():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(
        (DSN or "").replace("postgresql+asyncpg://", "postgresql://"), timeout=30)
    try:
        yield c
    finally:
        await c.close()


async def test_la_deuda_de_rls_no_crece(conexion):
    """LA PRUEBA. Una tabla de inquilino nueva no puede nacer sin RLS."""
    deuda = await _deuda(conexion)
    assert len(deuda) <= DEUDA_MAXIMA, (
        f"{len(deuda)} tablas con `workspace_id` y sin RLS, sobre un maximo de "
        f"{DEUDA_MAXIMA}. Las nuevas son deuda creada a sabiendas: en una tabla "
        f"sin RLS el unico aislamiento es que la consulta se acuerde de filtrar, "
        f"y una que se olvide devuelve datos de todos los inquilinos sin error.")


async def test_si_la_deuda_baja_hay_que_registrarlo(conexion):
    """El trinquete solo aprieta.

    Sin esto, una mejora se perderia en silencio y la proxima regresion cabria
    dentro del margen que dejo.
    """
    deuda = await _deuda(conexion)
    assert len(deuda) >= DEUDA_MAXIMA, (
        f"la deuda bajo a {len(deuda)}: actualiza DEUDA_MAXIMA para que el "
        f"trinquete siga apretado")


async def test_ninguna_tabla_protegida_se_queda_sin_politica(conexion):
    """RLS sin politica no protege: PROHIBE.

    Una tabla con RLS activado y sin ninguna politica devuelve cero filas a todo
    el mundo. Es el fallo silencioso que ya vacio el producto una vez.
    """
    huerfanas = [r["relname"] for r in await conexion.fetch("""
        SELECT c.relname FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
           AND NOT EXISTS (SELECT 1 FROM pg_policies p
                            WHERE p.schemaname = 'public'
                              AND p.tablename = c.relname)
         ORDER BY 1""")]
    assert not huerfanas, (
        f"tablas con RLS activado y sin ninguna politica: {huerfanas}. "
        "Devuelven cero filas a todo el mundo, sin error.")


async def test_toda_tabla_protegida_puede_leerse_por_su_dueno(conexion):
    """Contrapeso del anterior: RLS con SELECT, no solo con escritura.

    Una tabla con politicas de UPDATE pero sin SELECT es invisible para su
    propio inquilino, y eso se ve igual que «no hay datos».
    """
    sin_select = [r["relname"] for r in await conexion.fetch("""
        SELECT c.relname FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
           AND NOT EXISTS (SELECT 1 FROM pg_policies p
                            WHERE p.schemaname = 'public'
                              AND p.tablename = c.relname
                              AND p.cmd IN ('SELECT', 'ALL'))
         ORDER BY 1""")]
    assert not sin_select, (
        f"tablas con RLS y sin politica de SELECT: {sin_select}. Su propio "
        "inquilino no puede leerlas, y eso se ve igual que «no hay datos».")


def test_ninguna_migracion_nueva_crea_tablas_de_inquilino_sin_rls():
    """Guard estatico, para que el fallo aparezca al escribir y no al certificar.

    La comprobacion contra la base solo corre con PostgreSQL de certificacion.
    Esta lee el repositorio y funciona siempre: si una migracion nueva crea una
    tabla con `workspace_id` y no la protege en el mismo fichero, lo dice.
    """
    #: Migraciones anteriores a esta ya estan medidas por el trinquete de arriba.
    #: A partir de aqui, cada tabla nueva de inquilino nace protegida.
    DESDE = 559

    def _numero(nombre: str) -> int:
        m = re.match(r"(\d+)", nombre)
        return int(m.group(1)) if m else 0

    culpables: list[str] = []
    for f in sorted((_RAIZ / "db" / "migrations").glob("*.sql")):
        if _numero(f.name) <= DESDE:
            continue
        texto = re.sub(r"--[^\n]*", "", f.read_text(encoding="utf-8",
                                                    errors="replace"))
        creadas = re.findall(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)"
            r"\s*\((.*?)\n\)\s*;",
            texto, re.IGNORECASE | re.DOTALL)
        for tabla, cuerpo in creadas:
            if not re.search(r"\bworkspace_id\b", cuerpo, re.IGNORECASE):
                continue
            if not re.search(rf"ALTER\s+TABLE[^;]*\b{tabla}\b[^;]*"
                             rf"ENABLE\s+ROW\s+LEVEL\s+SECURITY",
                             texto, re.IGNORECASE | re.DOTALL):
                culpables.append(f"{f.name}:{tabla}")

    assert not culpables, (
        f"tablas de inquilino creadas sin activar RLS en el mismo fichero: "
        f"{culpables}. En una tabla sin RLS el unico aislamiento es que la "
        f"consulta se acuerde de filtrar.")


def test_el_guard_estatico_reconoce_de_verdad_una_tabla_desprotegida(tmp_path):
    """Control del guard: una expresion regular que no encuentra nada pasa
    siempre."""
    peligrosa = """
CREATE TABLE IF NOT EXISTS public.prueba_sin_rls (
    id BIGSERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL
);
"""
    protegida = peligrosa + """
ALTER TABLE public.prueba_sin_rls ENABLE ROW LEVEL SECURITY;
"""
    patron = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)"
        r"\s*\((.*?)\n\)\s*;", re.IGNORECASE | re.DOTALL)

    for texto, esperado in ((peligrosa, False), (protegida, True)):
        halladas = patron.findall(texto)
        assert halladas, "el patron no reconoce un CREATE TABLE normal"
        tabla, cuerpo = halladas[0]
        assert "workspace_id" in cuerpo
        protege = bool(re.search(
            rf"ALTER\s+TABLE[^;]*\b{tabla}\b[^;]*ENABLE\s+ROW\s+LEVEL\s+SECURITY",
            texto, re.IGNORECASE | re.DOTALL))
        assert protege is esperado


async def test_las_dos_tablas_fundacionales_estan_protegidas(conexion):
    """`workspaces` no entra en el recuento de arriba porque no tiene columna
    `workspace_id`. Que no se cuente no significa que no importe: es la tabla
    que define quien es cada inquilino.
    """
    for tabla in ("workspaces", "workspace_members"):
        r = await conexion.fetchrow(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_class "
            " WHERE relname = $1", tabla)
        assert r and r["relrowsecurity"] and r["relforcerowsecurity"], (
            f"'{tabla}' sin RLS forzado: es la base sobre la que se apoyan todas "
            f"las demas politicas")
        cmds = {p["cmd"] for p in await conexion.fetch(
            "SELECT cmd FROM pg_policies WHERE tablename = $1", tabla)}
        assert {"SELECT", "INSERT", "UPDATE", "DELETE"} <= cmds, (
            f"'{tabla}' con politicas incompletas: {sorted(cmds)}")
