"""Una peticion normal no puede alcanzar la conexion cross-tenant.

QUE SE VIGILA
-------------
Tras el cutover habra dos conexiones desde el mismo proceso:

    DATABASE_URL                       nelvyon_web_app   NOBYPASSRLS
    NELVYON_WEB_JOBS_DATABASE_URL      nelvyon_web_jobs  BYPASSRLS

La segunda existe porque los crons y el plano `platform` trabajan entre
inquilinos de verdad. Y como salta RLS, su aislamiento depende ENTERAMENTE del
`WHERE` que escriba cada consulta — el mismo contrato que `nelvyon_jobs` en el
lado Python.

Eso la convierte en el punto mas peligroso de todo el diseño: si una ruta normal
pudiera obtenerla, el cutover no habria cerrado nada. Habria movido el
superusuario de sitio y lo habria hecho mas dificil de ver.

POR QUE NO BASTA UNA CONVENCION
--------------------------------
«Los crons usan la otra conexion» es una frase, no un mecanismo. Lo que separa de
verdad es que `DbClient` —el cliente que usan las 854 rutas— lee UNICAMENTE
`DATABASE_URL`, y que nadie mas construye pools por su cuenta.

Estas pruebas comprueban las dos cosas. Sin la segunda, la primera se saltaria
con un `new Pool()` en cualquier fichero.

ESTADO
------
El rol privilegiado todavia no existe en produccion y la variable tampoco. Estas
pruebas se escriben AHORA, antes del cutover, para que el dia que la variable
aparezca ya haya algo vigilando quien la lee. Escribirlas despues seria escribirlas
cuando ya no se sabe si alguien la leyo.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CLIENTE = RAIZ / "backend" / "db" / "DbClient.ts"

#: Variable de la conexion cross-tenant. Solo puede leerla un cliente dedicado.
VAR_PRIVILEGIADA = "NELVYON_WEB_JOBS_DATABASE_URL"

#: Ficheros a los que SI se les permitira construir su propio pool, con su razon.
POOLS_PERMITIDOS = {
    "backend/db/DbClient.ts": "el cliente de las peticiones; lee solo DATABASE_URL",
    "backend/local-ai/db.ts": "conexion aparte a la IA propia, con rol minimo "
                              "`nelvyon_local_ai_app` y contexto de inquilino propio",
    "backend/local-ai/LocalVectorStore.ts": "reutiliza el pool de local-ai",
    "backend/agency/erp/ErpDomainSnapshotStore.ts": "espejo ERP; fija `app.tenant_id` "
                                                    "en cada transaccion",
    "backend/agency/erp/ErpRelationalMirror.ts": "igual que el anterior",
}


def _runtime() -> list[pathlib.Path]:
    """Codigo de runtime: sin pruebas, sin migraciones, sin scripts."""
    fuera = []
    for base in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        for f in base.rglob("*.ts"):
            s = str(f)
            if any(x in s for x in ("__tests__", "node_modules", ".test.ts", ".spec.ts",
                                    "migrations", "db\\scripts", "db/scripts")):
                continue
            fuera.append(f)
    return fuera


def test_el_inventario_encuentra_el_runtime():
    """Un glob roto daria cero ficheros y todo lo de abajo pasaria vacio."""
    assert len(_runtime()) >= 1000, (
        f"solo {len(_runtime())} ficheros de runtime: el inventario no vale")


def test_el_cliente_de_las_peticiones_no_lee_la_variable_privilegiada():
    """LA PRUEBA. `DbClient` es el que usan las 854 rutas."""
    fuente = CLIENTE.read_text(encoding="utf-8")
    codigo = "\n".join(l for l in fuente.splitlines()
                       if not l.lstrip().startswith(("//", "*", "/*")))
    assert VAR_PRIVILEGIADA not in codigo, (
        f"`DbClient` lee `{VAR_PRIVILEGIADA}`: cualquier ruta podria acabar "
        f"consultando con el rol que salta RLS")


def test_el_cliente_de_las_peticiones_lee_exactamente_una_variable():
    """EL CONTROL. Si no leyera ninguna, la prueba de arriba pasaria vacia."""
    codigo = CLIENTE.read_text(encoding="utf-8")
    variables = set(re.findall(r"process\.env\.([A-Z][A-Z0-9_]+)", codigo))
    conexion = {v for v in variables if "DATABASE_URL" in v or v.endswith("_URL")}
    assert conexion == {"DATABASE_URL"}, (
        f"`DbClient` lee estas variables de conexion: {sorted(conexion)}. "
        f"Deberia leer exactamente `DATABASE_URL`")


def test_nadie_mas_lee_la_variable_privilegiada():
    """Que `DbClient` no la lea no sirve si la lee cualquier otro fichero."""
    culpables = [f.relative_to(RAIZ).as_posix() for f in _runtime()
                 if VAR_PRIVILEGIADA in f.read_text(encoding="utf-8", errors="replace")]
    permitidos = {"backend/db/DbJobsClient.ts"}   # aun no existe; se creara en el cutover
    sobran = sorted(set(culpables) - permitidos)
    assert not sobran, (
        f"estos ficheros leen `{VAR_PRIVILEGIADA}` y no son el cliente dedicado: "
        f"{sobran}. Una ruta que llegue hasta ahi consulta sin RLS.")


@pytest.mark.parametrize("fichero", sorted(POOLS_PERMITIDOS))
def test_los_pools_declarados_siguen_existiendo(fichero):
    """Una lista de excepciones con entradas muertas deja de leerse."""
    assert (RAIZ / fichero).exists(), (
        f"`{fichero}` esta declarado como pool permitido y ya no existe: quitalo")


def test_ningun_fichero_nuevo_construye_su_propio_pool():
    """Sin esto, el resto se salta con un `new Pool()` en cualquier sitio.

    No es teorico: la conexion privilegiada es una cadena en una variable de
    entorno, y cualquier fichero del proceso puede leerla. Lo unico que impide
    que una ruta la use es que nadie escriba el codigo para hacerlo — asi que se
    vigila que no se escriba.
    """
    patron = re.compile(r"new\s+(?:pg\.)?Pool\s*\(")
    nuevos = sorted(f.relative_to(RAIZ).as_posix() for f in _runtime()
                    if patron.search(f.read_text(encoding="utf-8", errors="replace"))
                    and f.relative_to(RAIZ).as_posix() not in POOLS_PERMITIDOS)
    assert not nuevos, (
        f"estos ficheros construyen su propio pool de PostgreSQL y no estan "
        f"declarados: {nuevos}. Cada pool nuevo es una via para alcanzar una "
        f"conexion que la ruta no deberia tener; declaralo con su motivo o usa "
        f"`DbClient`.")
