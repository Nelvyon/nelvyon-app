"""Las dos generaciones del producto no pueden compartir nombre de tabla.

EL FALLO QUE ESTO IMPIDE
------------------------
NELVYON arrastra dos generaciones de esquema:

    ORM / workspace   tablas SIN prefijo   `contacts`, `messages`, `deals`
                      identidad: `workspace_id` (entero)
                      la crea `Base.metadata.create_all`

    SaaS / tenant     tablas CON prefijo   `saas_contacts`, `saas_deals`
                      identidad: `tenant_id` (uuid)
                      la crean las migraciones SQL

Conviven a proposito. En produccion `contacts` tiene 241 filas y `saas_contacts`
tiene 1: son entidades distintas, y hay hasta un ETL entre ellas
(`SaasDealsEtlService` lee `FROM deals WHERE workspace_id` y escribe en
`saas_deals`).

Las migraciones 401 y 402 se saltaron la convencion: crearon `conversations` y
`deals` con forma tenant pero SIN prefijo, invadiendo el espacio de nombres de
la otra generacion. El resultado fue que ninguna de las dos podia funcionar a la
vez:

    - con la forma ORM ganando  -> `/api/saas/inbox` devolvia 503 SCHEMA_MISMATCH
    - con la forma migrada      -> los guards ORM<->PostgreSQL en rojo

El conflicto nunca fue de forma. Era de NOMBRE.

QUE COMPRUEBA
-------------
Que ninguna tabla sin prefijo `saas_` sea reclamada a la vez por un modelo ORM
(por `workspace_id`) y por SQL crudo de la generacion tenant (por `tenant_id`).
Es la colision, no la forma concreta, lo que se prohibe.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
MIGRACIONES = REPO / "backend" / "db" / "migrations"
MODELOS = REPO / "backend" / "models"
SAAS_TS = REPO / "backend" / "saas"

#: SQL crudo en posicion de tabla.
_TABLA_SQL = re.compile(r"\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?([a-z_][a-z0-9_]*)\b")
_TABLENAME = re.compile(r"__tablename__\s*=\s*[\"']([a-z_][a-z0-9_]*)[\"']")


def tablas_del_orm() -> set[str]:
    """Las que declara `Base.metadata`, leidas de los modelos."""
    tablas = set()
    for f in MODELOS.glob("*.py"):
        tablas.update(_TABLENAME.findall(f.read_text(encoding="utf-8", errors="replace")))
    return tablas


def tablas_orm_de_generacion_workspace() -> set[str]:
    """Modelos que son de la generacion workspace: declaran `workspace_id` y no
    `tenant_id`.

    La distincion importa. `models/calendar_events.py` declara `tenant_id`
    porque ya se alineo A PROPOSITO con la tabla migrada en una fase anterior de
    esta auditoria. Ahi no hay conflicto: modelo y SQL crudo hablan de la misma
    tabla y la misma identidad. Marcarlo obligaria a deshacer una decision
    correcta.
    """
    tablas = set()
    for f in MODELOS.glob("*.py"):
        texto = f.read_text(encoding="utf-8", errors="replace")
        # Solo el cuerpo de la clase cuenta; los docstrings mencionan ambas.
        cuerpo = re.sub(r'"""(?:.|\n)*?"""', " ", texto)
        for tabla in _TABLENAME.findall(texto):
            declara_ws = re.search(r"^\s*workspace_id\s*=\s*Column", cuerpo, re.M)
            declara_tenant = re.search(r"^\s*tenant_id\s*=\s*Column", cuerpo, re.M)
            if declara_ws and not declara_tenant:
                tablas.add(tabla)
    return tablas


#: `FROM tabla alias` — el alias hace falta para saber a QUE tabla pertenece el
#: `tenant_id` que aparezca despues.
_TABLA_CON_ALIAS = re.compile(
    r"\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?([a-z_][a-z0-9_]*)"
    r"(?:\s+(?:AS\s+)?([a-z][a-z0-9_]*))?",
    re.IGNORECASE,
)

_PALABRAS_SQL = {"where", "on", "set", "values", "select", "left", "inner", "join",
                 "order", "group", "limit", "and", "or", "as", "using", "returning"}


def _sin_comentarios(texto: str) -> str:
    texto = re.sub(r"/\*.*?\*/", " ", texto, flags=re.S)
    return re.sub(r"//[^\n]*", " ", texto)


def tablas_en_sql_crudo_saas() -> set[str]:
    """Todas las que consulta `backend/saas` con SQL crudo, con o sin prefijo."""
    tablas = set()
    for f in SAAS_TS.rglob("*.ts"):
        if "node_modules" in f.parts:
            continue
        tablas.update(_TABLA_SQL.findall(_sin_comentarios(f.read_text(
            encoding="utf-8", errors="replace"))))
    return tablas


def tablas_consultadas_por_tenant() -> dict[str, set[str]]:
    """Tablas que `backend/saas` consulta USANDO `tenant_id`, y donde.

    Que `backend/saas` lea una tabla del ORM no es un conflicto: lo hace a
    proposito —`SaasDealsEtlService` lee `FROM deals WHERE workspace_id` para
    volcarlo en `saas_deals`—. El conflicto aparece solo cuando la consulta
    filtra por `tenant_id`, porque entonces las dos generaciones reclaman la
    misma tabla con identidades incompatibles.
    """
    encontradas: dict[str, set[str]] = {}
    for f in SAAS_TS.rglob("*.ts"):
        if "node_modules" in f.parts:
            continue
        texto = _sin_comentarios(f.read_text(encoding="utf-8", errors="replace"))
        for m in _TABLA_CON_ALIAS.finditer(texto):
            tabla, alias = m.group(1), m.group(2)
            if alias and alias.lower() in _PALABRAS_SQL:
                alias = None
            # La ventana termina donde termina la CONSULTA. En este repo las
            # consultas son literales de plantilla, asi que el backtick de
            # cierre es el limite. Sin esto, un `tenant_id` de la consulta
            # siguiente se atribuye a esta: `oauth_tokens` y `os_deliverables`
            # aparecian como conflicto filtrando ambas por `workspace_id`.
            resto = texto[m.end(): m.end() + 900]
            fin = resto.find("`")
            ventana = resto[: fin if fin != -1 else 400]
            usa_tenant = (
                f"{alias}.tenant_id" in ventana if alias
                else re.search(r"(?<![a-z_.])tenant_id", ventana) is not None
            )
            if usa_tenant:
                encontradas.setdefault(tabla, set()).add(f.relative_to(REPO).as_posix())
    return encontradas


def test_el_barrido_ve_las_dos_generaciones():
    """Control positivo: sin esto, un barrido vacio daria verde enganoso."""
    orm = tablas_del_orm()
    saas = tablas_en_sql_crudo_saas()
    assert "contacts" in orm, "no se detectan los modelos ORM"
    assert "deals" in orm, "no se detecta el modelo Deals"
    ws = tablas_orm_de_generacion_workspace()
    assert "conversations" in ws and "deals" in ws, "no se detecta la generacion workspace"
    assert "calendar_events" not in ws, (
        "calendar_events se clasifica como workspace; su modelo ya declara tenant_id")
    assert "saas_contacts" in saas, "no se detecta el SQL crudo de la generacion tenant"
    assert "saas_deals" in saas, "no se detecta saas_deals"
    assert len(orm) > 50, f"solo {len(orm)} modelos; el barrido esta roto"


def test_el_barrido_ignora_los_comentarios():
    """Control negativo, y no es hipotetico.

    `SaasCampaniasService.ts` tiene `@deprecated Prefer deal_stage — synced from
    deals but not authoritative.` Ese «from deals» NO es una consulta, y contarlo
    convertia el test en ruido.
    """
    muestra = "/** @deprecated synced from deals */\nconst q = `SELECT 1 FROM saas_deals`;"
    limpio = re.sub(r"/\*.*?\*/", " ", muestra, flags=re.S)
    limpio = re.sub(r"//[^\n]*", " ", limpio)
    encontradas = set(_TABLA_SQL.findall(limpio))
    assert "deals" not in encontradas, "el barrido cuenta comentarios como consultas"
    assert "saas_deals" in encontradas, "el barrido perdio la consulta real"


def test_que_backend_saas_lea_tablas_del_orm_no_es_un_conflicto():
    """Control negativo, y deliberado: el ETL existe y debe seguir existiendo.

    `SaasDealsEtlService` lee `FROM deals WHERE workspace_id = $1` y vuelca en
    `saas_deals`. Si el guard marcara eso, obligaria a romper el puente entre
    las dos generaciones — que es justo lo que NO queremos.
    """
    por_tenant = tablas_consultadas_por_tenant()
    assert "deals" not in por_tenant, (
        f"el guard marca la lectura del ETL como conflicto: {por_tenant.get('deals')}"
    )
    etl = (SAAS_TS / "SaasDealsEtlService.ts").read_text(encoding="utf-8")
    assert re.search(r"FROM deals WHERE workspace_id", etl), (
        "el ETL ya no lee `deals` por workspace_id: revisa este control"
    )


def test_ninguna_tabla_sin_prefijo_la_reclaman_las_dos_generaciones():
    """La propiedad. Es lo que rompio `conversations` y `deals`."""
    orm_workspace = tablas_orm_de_generacion_workspace()
    por_tenant = tablas_consultadas_por_tenant()
    colisiones = {
        t: sorted(f) for t, f in por_tenant.items()
        if t in orm_workspace and not t.startswith("saas_")
    }
    assert not colisiones, (
        "tablas que el ORM declara y `backend/saas` consulta por tenant_id:\n  "
        + "\n  ".join(f"{t}: {f}" for t, f in sorted(colisiones.items()))
        + "\nLa generacion tenant usa prefijo `saas_`; la del ORM va sin el. "
          "Si backend/saas necesita esa tabla, renombrala a `saas_<tabla>` "
          "en una migracion nueva y actualiza sus consultas."
    )


def test_las_migraciones_no_crean_tablas_tenant_sin_prefijo():
    """El origen del problema: la 401 y la 402 crearon `conversations` y
    `deals` con `tenant_id` pero sin prefijo.

    Se comprueba sobre lo que la cadena deja al FINAL: la 535 les devuelve el
    prefijo, asi que el nombre sin prefijo queda libre para el ORM.
    """
    restauracion = (MIGRACIONES / "535_saas_conversations_recupera_su_prefijo.sql").read_text(
        encoding="utf-8"
    )
    for tabla, destino in (
        ("conversations", "saas_conversations"),
        ("conversation_messages", "saas_conversation_messages"),
        ("deals", "saas_pipeline_deals"),
    ):
        assert f"'{tabla}'" in restauracion, f"la 535 no cubre {tabla}"
        assert f"'{destino}'" in restauracion, f"la 535 no declara el destino {destino}"
    for destructivo in ("DROP TABLE", "DELETE FROM", "TRUNCATE", "DROP COLUMN"):
        assert destructivo not in restauracion.upper(), f"la 535 hace {destructivo}"
