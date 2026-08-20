"""Todo modelo tiene su tabla en las migraciones.

EL FALLO QUE ESTO IMPIDE
------------------------
42 tablas del ORM no las creaba ninguna migracion: existian porque
`Base.metadata.create_all()` corre al arrancar el API. Con rol superusuario eso
funcionaba y por eso nadie lo noto en año y medio.

Al activar RLS parcial el API pasa a conectarse como `nelvyon_app`, que no tiene
CREATE sobre `public`. Desde entonces `create_all` no puede crear nada:

  * produccion sigue bien, porque las tablas ya existian;
  * una base construida solo con migraciones se quedaba sin ellas;
  * y el primer modelo nuevo sin migracion habria roto el arranque en produccion
    con `permission denied for schema public`.

La migracion 545 cerro la brecha. Este guard impide que se vuelva a abrir: si
alguien añade un modelo y olvida la migracion, CI lo dice ANTES del despliegue, no
el contenedor a las tres de la mañana.

POR QUE COMPARA CONTRA UNA BASE DE MIGRACIONES
----------------------------------------------
Comparar el ORM contra produccion no serviria: produccion tiene las tablas porque
`create_all` las creo, asi que el hueco no se veria. La unica comparacion que lo
detecta es contra una base levantada EXCLUSIVAMENTE con migraciones.
"""
from __future__ import annotations

import importlib
import os
import pkgutil

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN,
    reason="sin NELVYON_PG_CERT_DSN: hace falta una base construida con migraciones",
)

#: Modelos declarados cuya tabla no crea ninguna migracion.
#:
#: Esta VACIA, y esa es la situacion correcta. Estuvo poblada con `oauth_tokens` y
#: `onboarding_progress` mientras esas dos tablas solo existian en Alembic —que en
#: produccion esta desactivado con SKIP_ALEMBIC=1—, asi que el codigo las usaba y
#: la base no las tenia. La migracion 546 las creo, con RLS, y la exclusion dejo
#: de ser cierta: lo detecto `test_la_lista_de_exclusiones_sigue_siendo_cierta`.
#:
#: Anadir algo aqui exige justificarlo por escrito. Una excepcion que ya no
#: excepciona nada solo sirve para tapar la siguiente.
SIN_TABLA_NI_EN_PRODUCCION: set[str] = set()


def _tablas_de_los_modelos() -> set[str]:
    import models
    from models.base import Base

    for m in pkgutil.iter_modules(models.__path__):
        try:
            importlib.import_module("models." + m.name)
        except Exception:
            # Un modulo que no importa no declara tablas; no es asunto de este guard.
            pass
    return set(Base.metadata.tables)


def _tablas_de_la_base() -> set[str]:
    psycopg2 = pytest.importorskip("psycopg2")
    dsn = (DSN or "").replace("postgresql+asyncpg://", "postgresql://")
    con = psycopg2.connect(dsn)
    try:
        cur = con.cursor()
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        return {r[0] for r in cur.fetchall()}
    finally:
        con.close()


def test_el_inventario_no_esta_vacio():
    """Control positivo: un import roto dejaria el conjunto vacio y todo lo de
    abajo pasaria sin comprobar nada."""
    modelos = _tablas_de_los_modelos()
    assert len(modelos) > 50, f"solo se encontraron {len(modelos)} tablas de modelo"
    assert len(_tablas_de_la_base()) > 500


def test_cada_modelo_tiene_su_tabla_en_las_migraciones():
    """EL GUARD. Falla si se añade un modelo sin su migracion."""
    faltan = _tablas_de_los_modelos() - _tablas_de_la_base() - SIN_TABLA_NI_EN_PRODUCCION
    assert not faltan, (
        f"modelos sin migracion: {sorted(faltan)}. El API se conecta como "
        f"`nelvyon_app`, que no tiene CREATE: estas tablas NO se crearan solas al "
        f"arrancar. Añade la migracion, o justifica la exclusion en "
        f"SIN_TABLA_NI_EN_PRODUCCION."
    )


def test_la_lista_de_exclusiones_sigue_siendo_cierta():
    """Control negativo de la exclusion.

    Si alguien crea `oauth_tokens` u `onboarding_progress` en una migracion, la
    exclusion sobra y hay que retirarla: una excepcion que ya no excepciona nada
    solo sirve para tapar la siguiente.
    """
    presentes = _tablas_de_la_base()
    sobran = SIN_TABLA_NI_EN_PRODUCCION & presentes
    assert not sobran, (
        f"{sorted(sobran)} ya existen en las migraciones: retiralas de "
        f"SIN_TABLA_NI_EN_PRODUCCION"
    )


def test_las_tablas_que_creo_la_545_estan_todas():
    """Que la 545 no se dejara ninguna por el camino."""
    de_la_545 = {
        "activities", "appointments", "automation_jobs", "automation_webhooks",
        "blog_posts", "campaigns", "connector_configs", "contract_logs",
        "contracts", "conversations", "deals", "form_items", "funnel_items",
        "helpdesk_tickets", "messages", "nelvyon_agents", "nelvyon_assets",
        "nelvyon_bot_templates", "nelvyon_outputs", "nelvyon_products",
        "nelvyon_projects", "nelvyon_quality_metrics", "nelvyon_user_settings",
        "oidc_states", "partner_records", "pipeline_deals", "platform_metrics",
        "presentation_history", "pricing_promos", "report_items",
        "revenue_records", "sales_records", "security_events", "segment_results",
        "user_roles", "users", "voice_pilot_inbound", "voice_pilot_usage",
        "website_items", "website_pages", "workflow_executions", "workflow_rules",
    }
    assert len(de_la_545) == 42
    faltan = de_la_545 - _tablas_de_la_base()
    assert not faltan, f"la 545 no creo: {sorted(faltan)}"
