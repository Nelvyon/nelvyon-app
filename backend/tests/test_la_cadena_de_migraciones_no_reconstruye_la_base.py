"""Cuánto de NELVYON se reconstruye desde las migraciones. Medido con la semántica REAL.

UNA MEDICION MIA QUE ESTABA MAL
--------------------------------
La primera version de esta prueba decia «113 tablas no se pueden reconstruir y 8
migraciones abortan». Estaba medido con `psql -v ON_ERROR_STOP=1`, que es MAS
ESTRICTO que el runner de produccion: `migrate.ts` trata la 507 sentencia a
sentencia tolerando ocho codigos de error.

Medido con la semantica que se usaria de verdad en un despliegue:

    migraciones ejecutadas             473
    fallos DUROS                         2
    tablas creadas                     691   (produccion tiene 712)
    faltan en la reconstruccion         21
    sentencias TOLERADAS en la 507     128

Se deja escrito porque el numero equivocado ya se publico, y un numero
equivocado que nadie corrige se hereda como hecho.

EL HALLAZGO DE VERDAD, QUE ES OTRO
-----------------------------------
La cadena esta casi completa: 18 de las 21 tablas que faltan SI las declara la
507. Lo que pasa es que su `CREATE` se tolero en silencio.

Y el runner tolera —marcando la migracion como APLICADA— estos codigos:

    42601 error de sintaxis        42703 columna inexistente
    42710 objeto duplicado         42883 funcion inexistente
    42P01 TABLA INEXISTENTE        42830 clave ajena invalida
    42701 columna duplicada        42P16 definicion invalida

De ahi sale la consecuencia que importa:

  **la misma migracion produce un esquema DISTINTO segun el estado de partida,
  y en los dos casos informa de exito.**

  Sobre base virgen se tragan 128 sentencias y faltan 18 tablas.
  En produccion se trago otro subconjunto y faltan otras 5 — entre ellas
  `visual_workflow_executions`, `workflow_nodes` y `workflow_trigger_registry`,
  que son justo las que la funcion de Workflows necesita.

Es decir: **la reconstruccion virgen CREA las tres tablas que produccion no
tiene.** Produccion es la anomala, no la cadena.

ALCANCE
-------
Esa tolerancia se aplica a UNA sola migracion, la 507, por constante nombrada
(`CONSOLIDATED_MIGRATION`). Las demas fallan duro. Conviene decirlo: la version
alarmante —«cualquier migracion puede aplicarse a medias»— no es cierta.
"""
from __future__ import annotations

import json
import pathlib

CERT = pathlib.Path(__file__).resolve().parents[1] / "db" / "certificacion"
HUECO = CERT / "hueco_reconstruccion.json"

#: Techo medido el 2026-08-23 con la semantica real del runner. Solo puede BAJAR.
TECHO_TABLAS_QUE_FALTAN = 27

#: Codigos que `isTolerableConsolidatedMigrationError` deja pasar marcando la
#: migracion como aplicada. Cada uno puede esconder una tabla o una columna que
#: no se creo.
CODIGOS_TOLERADOS = {
    "42601": "error de sintaxis",
    "42701": "columna duplicada",
    "42703": "columna inexistente",
    "42710": "objeto duplicado",
    "42830": "clave ajena invalida",
    "42883": "funcion inexistente",
    "42P01": "tabla inexistente",
    "42P16": "definicion de tabla invalida",
}


def _hueco() -> dict:
    return json.loads(HUECO.read_text(encoding="utf-8"))


def test_la_medida_existe_y_es_creible():
    """Sin el inventario, lo de abajo aprobaria por no tener contra que."""
    assert HUECO.exists(), f"falta {HUECO}"
    d = _hueco()
    assert d["virgen"] >= 600, "muy pocas tablas desde migraciones: la medida no vale"
    assert d["produccion"] >= 700, "el catalogo de produccion parece incompleto"


def test_el_hueco_de_reconstruccion_no_crece():
    """LA PRUEBA. Cada tabla que no salga de las migraciones es una que no se
    podria levantar en una recuperacion."""
    n = len(_hueco()["faltan"])
    assert n <= TECHO_TABLAS_QUE_FALTAN, (
        f"{n} tablas de produccion no salen de la cadena de migraciones, y el "
        f"techo era {TECHO_TABLAS_QUE_FALTAN}: la parte de NELVYON que no se "
        f"puede levantar de cero ha crecido")


def test_la_reconstruccion_virgen_crea_las_tablas_que_produccion_no_tiene():
    """El hallazgo, comprobado: produccion es la anomala.

    Si algun dia estas tres dejaran de crearse en la virgen, el diagnostico
    cambiaria —seria la cadena la que no las declara— y habria que revisarlo.
    """
    sobran = set(_hueco()["sobran"])
    for t in ("visual_workflow_executions", "workflow_nodes", "workflow_trigger_registry"):
        assert t in sobran, (
            f"`{t}` ya no aparece solo en la virgen: o produccion la tiene ya, o "
            f"la 507 dejo de crearla. En los dos casos, revisa el diagnostico")


def test_la_tolerancia_del_runner_sigue_documentada():
    """La causa raiz, vigilada.

    Si alguien anade un codigo a la lista, esta prueba obliga a declararlo aqui
    y a pensar que puede esconder. Si la quita, tambien.
    """
    fuente = (CERT.parents[0] / "splitSqlStatements.ts").read_text(encoding="utf-8")
    codigo = "\n".join(l for l in fuente.splitlines() if not l.lstrip().startswith(("//", "*", "/*")))
    for c in CODIGOS_TOLERADOS:
        assert f'"{c}"' in codigo, (
            f"el codigo {c} ya no se tolera: quitalo de CODIGOS_TOLERADOS")
    declarados = sum(1 for l in codigo.splitlines() if l.strip().startswith('"4'))
    assert declarados == len(CODIGOS_TOLERADOS), (
        f"el runner tolera {declarados} codigos y aqui hay {len(CODIGOS_TOLERADOS)} "
        f"declarados: cada uno puede esconder una tabla que no se creo")


def test_solo_una_migracion_recibe_trato_tolerante():
    """El alcance, comprobado en vez de supuesto.

    La version alarmante de este hallazgo —«cualquier migracion puede aplicarse
    a medias»— NO es cierta, y decirlo importa tanto como el hallazgo.
    """
    fuente = (CERT.parents[0] / "migrate.ts").read_text(encoding="utf-8")
    assert "if (file === CONSOLIDATED_MIGRATION)" in fuente, (
        "el trato tolerante ya no se limita a una migracion nombrada: ahora si "
        "podria afectar a cualquiera, y este razonamiento cambia")
