"""Cuanto de NELVYON se reconstruye desde las migraciones. Tercera medida, y la buena.

DOS MEDIDAS MIAS QUE ESTABAN MAL, Y POR QUE
--------------------------------------------
1. La primera decia «113 tablas no se reconstruyen, 8 migraciones abortan». Estaba
   hecha con `psql -v ON_ERROR_STOP=1`, MAS ESTRICTO que el runner: `migrate.ts`
   trata la 507 sentencia a sentencia tolerando ocho codigos.

2. La segunda decia «21 tablas». Usaba un cortador de SQL propio que NO saltaba
   comentarios de linea, asi que partia en el `;` de
   `-- Immutable audit trail (append-only; no updated_at)` y generaba fragmentos
   invalidos. Llego a reportar «1 error de sintaxis en la 507» que NO EXISTE: era
   mi herramienta inventandolo. El cortador real
   (`db/splitSqlStatements.ts`) si salta comentarios.

Con un cortador equivalente al real y comparando los mismos tipos de objeto en
los dos lados:

    migraciones ejecutadas         473
    fallos DUROS                     0
    objetos creados                711   (produccion tiene 712)

LA CONCLUSION ES LA CONTRARIA DE LA QUE PUBLIQUE
--------------------------------------------------
**La cadena de migraciones SI reconstruye el esquema.** Lo que falta se explica
entero:

    _migrations        lo crea el propio runner
    local_ai_*  (6)    los crea el stack de IA local, otro subsistema

Hueco genuino: **cero**.

Y al reves, lo que si es un hallazgo: **produccion carece de SEIS objetos que una
reconstruccion limpia si crea**:

    visual_workflow_executions      workflow_nodes
    workflow_trigger_registry       os_public_api_keys
    saas_user_invoices_legacy       user_provider_api_keys

Las tres primeras son exactamente las que la funcion de Workflows necesita. Es
decir: **produccion es la anomala, no la cadena**, y no hay que inventar esas
tablas — hay que averiguar por que su `CREATE` no prospero alli.

LA CAUSA: 94 SENTENCIAS TOLERADAS
----------------------------------
`migrate.ts` tolera ocho codigos de error EN LA 507 y aun asi la marca como
aplicada. Sobre una base virgen se tragan 94 sentencias:

    42883  funcion inexistente   40
    42703  columna inexistente   39
    42P01  tabla inexistente     15

Consecuencia: **la misma migracion produce un esquema distinto segun el estado de
partida, y en los dos casos informa de exito.** En produccion se trago un
subconjunto distinto, y de ahi salen esos seis objetos ausentes.

ALCANCE, COMPROBADO
-------------------
La tolerancia se limita a UNA migracion, la 507, por constante nombrada
(`CONSOLIDATED_MIGRATION`). Las demas fallan duro. La version alarmante
—«cualquier migracion puede aplicarse a medias»— NO es cierta.

COMO SE REPRODUCE
-----------------
`db/certificacion/reconstruir_virgen.py` sobre una base desechable del contenedor
local. Tarda unos minutos, por eso esta prueba no lo reejecuta: vigila que el
inventario medido no empeore.
"""
from __future__ import annotations

import json
import pathlib

CERT = pathlib.Path(__file__).resolve().parents[1] / "db" / "certificacion"
HUECO = CERT / "hueco_reconstruccion.json"

#: Lo que falta en una reconstruccion, y por que esta bien que falte.
FALTAN_EXPLICADAS = {
    "_migrations": "la crea el propio runner de migraciones al arrancar",
    "local_ai_audit": "stack de IA local, subsistema aparte con su propio esquema",
    "local_ai_config": "idem",
    "local_ai_ingest_jobs": "idem",
    "local_ai_memory": "idem",
    "local_ai_rag_chunks": "idem",
    "local_ai_rag_documents": "idem",
}

#: Objetos que la reconstruccion crea y PRODUCCION no tiene. Cada uno es una
#: sentencia de la 507 que alli se tolero en silencio.
FALTAN_EN_PRODUCCION = {
    "visual_workflow_executions": "la necesita el editor visual de workflows",
    "workflow_nodes": "idem",
    "workflow_trigger_registry": "idem",
    "os_public_api_keys": "claves de la API publica",
    "saas_user_invoices_legacy": "tabla de compatibilidad de facturacion",
    "user_provider_api_keys": "claves por proveedor y usuario",
}


def _hueco() -> dict:
    return json.loads(HUECO.read_text(encoding="utf-8"))


def test_la_medida_existe_y_es_creible():
    """Sin el inventario, lo de abajo aprobaria por no tener contra que."""
    assert HUECO.exists(), f"falta {HUECO}"
    d = _hueco()
    assert d["virgen"] >= 700, f"solo {d['virgen']} objetos desde migraciones: la medida no vale"
    assert d["produccion"] >= 700, "el catalogo de produccion parece incompleto"


def test_todo_lo_que_falta_en_la_reconstruccion_esta_explicado():
    """LA PRUEBA. Un hueco sin explicar es una parte de NELVYON que no se
    podria levantar en una recuperacion y nadie sabria por que."""
    sin_explicar = sorted(t for t in _hueco()["faltan"] if t not in FALTAN_EXPLICADAS)
    assert not sin_explicar, (
        f"estos objetos de produccion no salen de la cadena de migraciones y no "
        f"estan explicados: {sin_explicar}. O se declaran con su motivo, o se "
        f"anaden a una migracion.")


def test_las_explicaciones_siguen_haciendo_falta():
    """Una lista con entradas muertas deja de leerse."""
    faltan = set(_hueco()["faltan"])
    sobran = sorted(t for t in FALTAN_EXPLICADAS if t not in faltan)
    assert not sobran, (
        f"estos ya se reconstruyen y siguen declarados como excepcion: {sobran}")


def test_produccion_carece_de_objetos_que_la_cadena_si_crea():
    """El hallazgo de verdad: produccion es la anomala.

    Si algun dia dejaran de aparecer aqui, o produccion ya los tiene —y entonces
    hay que quitarlos de la lista— o la 507 dejo de crearlos, que seria una
    regresion. En los dos casos hay que mirarlo.
    """
    sobran = set(_hueco()["sobran"])
    sin_declarar = sorted(t for t in sobran if t not in FALTAN_EN_PRODUCCION)
    assert not sin_declarar, (
        f"la reconstruccion crea objetos que produccion no tiene y no estan "
        f"declarados: {sin_declarar}")
    resueltos = sorted(t for t in FALTAN_EN_PRODUCCION if t not in sobran)
    assert not resueltos, (
        f"estos ya no faltan en produccion: {resueltos}. Quitalos de la lista o "
        f"comprueba que la 507 sigue creandolos.")


def test_la_tolerancia_del_runner_sigue_limitada_a_una_migracion():
    """El alcance, comprobado en vez de supuesto.

    La version alarmante —«cualquier migracion puede aplicarse a medias»— NO es
    cierta, y decirlo importa tanto como el hallazgo.
    """
    fuente = (CERT.parents[0] / "migrate.ts").read_text(encoding="utf-8")
    assert "if (file === CONSOLIDATED_MIGRATION)" in fuente, (
        "el trato tolerante ya no se limita a una migracion nombrada: ahora si "
        "podria afectar a cualquiera, y este razonamiento cambia")
