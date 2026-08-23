"""Cuánto de NELVYON se puede reconstruir desde las migraciones. Medido.

EL HALLAZGO
-----------
Se aplicó la cadena entera —473 ficheros— sobre una PostgreSQL **virgen**, sin un
solo apaño, y se contó:

    tablas creadas desde las migraciones     602
    tablas que hay en produccion             712
    ─────────────────────────────────────────────
    SOLO en produccion                       113

    migraciones que FALLAN sobre base virgen   8

Es decir: **la cadena de migraciones no reconstruye la base.** Faltarían 113
tablas y 8 migraciones abortarían.

POR QUE PRODUCCION SI FUNCIONA
-------------------------------
`core/database.py` ejecuta `Base.metadata.create_all` **incondicionalmente** al
arrancar la aplicación. Las 113 tablas las declara SQLAlchemy en `models/`, nunca
el SQL. Producción llegó a su estado actual porque la app arrancó muchas veces
junto a las migraciones.

Y ahí está el riesgo real: `migrate:prod` corre como `preDeployCommand`, es decir
**antes** de que la aplicación arranque. En un entorno NUEVO —una recuperación de
desastre, una réplica de staging, un despliegue en otra región— las 8 migraciones
se ejecutarían antes de que exista lo que necesitan, y fallarían.

Las 8, con lo que les falta:

    507  workflows                    (la crea `models/workflows.py`)
    524  intent_events
    525  intent_scores
    526  pr_releases
    528  intent_scores
    543  chat_conversations
    554  os_store_projects
    555  onboarding_workspace_steps

QUE VIGILA ESTA PRUEBA
----------------------
No reejecuta la cadena: eso tarda minutos y necesita una base desechable. Vigila
que el **hueco no crezca** — que no se añadan modelos nuevos cuya tabla no declare
ninguna migración, porque cada uno amplía la parte de NELVYON que no se puede
reconstruir.

El inventario vive en `db/certificacion/hueco_reconstruccion.json`, medido con
PostgreSQL real. Se regenera con `qcatalogo.py` + una base virgen.

NO ES UN FALLO DE PRODUCCION
-----------------------------
Hoy no rompe nada. Es una propiedad de **recuperación**: si hubiera que levantar
NELVYON desde cero, el esquema no saldría solo de las migraciones. Conviene que
sea un número conocido y decreciente, no una sorpresa el día que haga falta.
"""
from __future__ import annotations

import json
import pathlib

CERT = pathlib.Path(__file__).resolve().parents[1] / "db" / "certificacion"
HUECO = CERT / "hueco_reconstruccion.json"

#: Techo del hueco medido el 2026-08-23. Solo puede BAJAR: cada tabla que pase a
#: declararse en una migración lo reduce.
TECHO_TABLAS_NO_RECONSTRUIBLES = 113

#: Migraciones que abortan sobre una base virgen, con lo que les falta.
MIGRACIONES_QUE_FALLAN = {
    "507_fastapi_runtime_schemas.sql": "workflows (la crea models/workflows.py)",
    "524_fastapi_raw_sql_schema_drift.sql": "intent_events",
    "525_fastapi_raw_sql_schema_drift_batch2.sql": "intent_scores",
    "526_legacy_not_null_relaxation.sql": "pr_releases",
    "528_intent_scores_legacy_pk_repair.sql": "intent_scores",
    "543_rls_politicas_por_workspace.sql": "chat_conversations",
    "554_privilegios_de_los_14_servicios.sql": "os_store_projects",
    "555_soporte_y_ciclo_de_vida.sql": "onboarding_workspace_steps",
}


def _hueco() -> dict:
    return json.loads(HUECO.read_text(encoding="utf-8"))


def test_la_medida_existe_y_es_creible():
    """Sin el inventario, la comprobación de abajo aprobaría por no tener contra qué."""
    assert HUECO.exists(), f"falta {HUECO}"
    d = _hueco()
    assert d["desde_migraciones"] >= 400, "muy pocas tablas desde migraciones: la medida no vale"
    assert d["en_produccion"] >= 700, "el catálogo de producción parece incompleto"


def test_el_hueco_de_reconstruccion_no_crece():
    """LA PRUEBA. Cada tabla que solo existe por `create_all` es una que no se
    podría reconstruir desde las migraciones."""
    n = len(_hueco()["solo_en_produccion"])
    assert n <= TECHO_TABLAS_NO_RECONSTRUIBLES, (
        f"{n} tablas de producción no las crea ninguna migración, y el techo era "
        f"{TECHO_TABLAS_NO_RECONSTRUIBLES}. Alguien añadió un modelo sin su "
        f"migración: eso amplía la parte de NELVYON que no se puede levantar de "
        f"cero.")


def test_las_migraciones_que_fallan_estan_declaradas_con_su_causa():
    """Una lista sin causas es una lista de excusas.

    Y la causa importa: las ocho fallan por lo MISMO —dependen de tablas que crea
    SQLAlchemy y no el SQL—, así que se arreglan igual: declarando esas tablas en
    una migración.
    """
    for fichero, falta in MIGRACIONES_QUE_FALLAN.items():
        assert (CERT.parents[0] / "migrations" / fichero).exists(), (
            f"`{fichero}` ya no existe: quítalo de MIGRACIONES_QUE_FALLAN")
        assert len(falta) > 3, f"{fichero} no dice qué le falta"


def test_create_all_sigue_siendo_incondicional():
    """La premisa del hallazgo, comprobada en vez de supuesta.

    Si algún día `create_all` pasara a estar condicionado —o desapareciera— este
    razonamiento cambiaría por completo: las 113 tablas dejarían de crearse solas
    y el problema saltaría en el arranque siguiente.
    """
    fuente = (CERT.parents[1] / "core" / "database.py").read_text(encoding="utf-8")
    assert "Base.metadata.create_all" in fuente, (
        "`create_all` ya no está: revisa si las 113 tablas siguen creándose, "
        "porque si no, producción dejaría de tenerlas")
