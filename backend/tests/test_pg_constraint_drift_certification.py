"""Certificacion de constraint drift contra PostgreSQL REAL.

POR QUE ESTE FICHERO EXISTE
---------------------------
`test_constraint_drift_analyzer.py` prueba el analizador con fixtures: demuestra
que la LOGICA es correcta. No demuestra nada sobre el esquema del producto,
porque nunca lee un catalogo.

Aqui se lee `pg_catalog` de una base con la cadena completa de migraciones
aplicada y se compara con los INSERT reales del repositorio. Es la unica forma
de detectar un writer que omite una columna `NOT NULL`: SQLite no reproduce esa
restriccion, asi que la suite normal da verde mientras PostgreSQL rechazaria el
INSERT en produccion.

COMO SE EJECUTA

    node scripts/pg-cert-db.mjs            # aplica las 430 migraciones
    NELVYON_PG_CERT_DSN=postgresql://... pytest tests/test_pg_constraint_drift_certification.py

Sin DSN los tests se SALTAN, y el salto es explicito: no se declara certificado
nada que no se haya medido.

POR QUE HAY CONTROL POSITIVO
----------------------------
El detector encontro 0 casos de `ON_CONFLICT_DRIFT`. Un cero solo significa algo
si se demuestra que el detector habria encontrado un positivo. Por eso
`test_control_positivo_*` fabrica drift conocido en una tabla temporal real y
exige que se detecte. Si esos tests pasan y el barrido da cero, el cero es
evidencia. Si el detector se rompe, el control lo delata antes que el barrido.

LINEA BASE
----------
`DRIFT_CONOCIDO` fija los hallazgos medidos el 2026-08-13. El test falla si
aparece drift NUEVO (regresion) y tambien si desaparece uno conocido sin
actualizar la lista — un arreglo debe quedar registrado, no colarse en silencio.
"""
from __future__ import annotations

import os

import pytest

from ._constraint_drift import (
    NOT_NULL_DRIFT,
    ON_CONFLICT_DRIFT,
    Writer,
    comparar,
    leer_catalogo,
    writers_del_repo,
)

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

DRIFT_CONOCIDO: frozenset = frozenset()
#: VACIO, y esa es la noticia. Llego a haber 22 writers que omitian una columna
#: `NOT NULL` sin default: su INSERT fallaba contra PostgreSQL y pasaba en
#: SQLite, que no reproduce la restriccion.
#:
#: Se cerraron todos alineando cada writer con la definicion que realmente gana
#: en la cadena de migraciones —no relajando restricciones ni metiendolos en una
#: allowlist—. Cada retirada se hizo despues de que PostgreSQL demostrara que el
#: hallazgo ya no ocurre.
#:
#: Si vuelve a aparecer uno, `test_no_hay_drift_nuevo` lo dice.

_TABLA_SONDA = "zz_drift_probe"


def _clave(h) -> str:
    return f"{h.clase}|{h.tabla}|{','.join(h.columnas)}|{h.fichero}"


@pytest.fixture(scope="module")
def catalogo():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        esquema = leer_catalogo(cur)
        cur.close()
    finally:
        conn.close()
    return esquema


@pytest.fixture(scope="module")
def catalogo_con_sonda():
    """Tabla real con drift fabricado, para probar que el detector esta vivo.

    Se crea y se destruye dentro del test: no deja rastro en la base.
    """
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(f"DROP TABLE IF EXISTS {_TABLA_SONDA}")
        cur.execute(
            f"""
            CREATE TABLE {_TABLA_SONDA} (
              a INTEGER NOT NULL,
              b INTEGER NOT NULL,
              obligatoria TEXT NOT NULL,
              con_default TEXT NOT NULL DEFAULT 'x',
              UNIQUE (b, a)
            )
            """
        )
        esquema = leer_catalogo(cur)
        cur.execute(f"DROP TABLE IF EXISTS {_TABLA_SONDA}")
        cur.close()
    finally:
        conn.close()
    return esquema


def _writer(**kw) -> Writer:
    base = dict(
        tabla=_TABLA_SONDA,
        columnas=frozenset({"a", "b", "obligatoria"}),
        conflict_target=None,
        conflict_por_constraint=None,
        fichero="<sonda>",
    )
    base.update(kw)
    return Writer(**base)


# ───────────────────────────── control positivo: el detector esta vivo


@requiere_pg
def test_control_positivo_on_conflict_sin_arbitro(catalogo_con_sonda):
    """`ON CONFLICT (a)` con `UNIQUE (b, a)` NO tiene arbitro: debe detectarse.

    Si esto no salta, el cero de ON_CONFLICT_DRIFT del barrido no vale nada.
    """
    hallazgos = comparar([_writer(conflict_target=frozenset({"a"}))], catalogo_con_sonda)
    clases = {h.clase for h in hallazgos}
    assert ON_CONFLICT_DRIFT in clases, (
        "el detector de ON CONFLICT no reacciona ante un arbitro inexistente "
        "en una tabla PostgreSQL real"
    )


@requiere_pg
def test_control_negativo_on_conflict_con_arbitro(catalogo_con_sonda):
    """`ON CONFLICT (a, b)` con `UNIQUE (b, a)` SI tiene arbitro: el orden no importa.

    Sin esto, un detector que marcase todo tambien pasaria el control positivo.
    """
    hallazgos = comparar(
        [_writer(conflict_target=frozenset({"a", "b"}))], catalogo_con_sonda
    )
    assert not [h for h in hallazgos if h.clase == ON_CONFLICT_DRIFT], (
        "marca drift donde el UNIQUE cubre exactamente esas columnas"
    )


@requiere_pg
def test_control_positivo_not_null_omitida(catalogo_con_sonda):
    """Omitir una columna NOT NULL sin default debe detectarse."""
    hallazgos = comparar(
        [_writer(columnas=frozenset({"a", "b"}))], catalogo_con_sonda
    )
    columnas = {c for h in hallazgos if h.clase == NOT_NULL_DRIFT for c in h.columnas}
    assert "obligatoria" in columnas


@requiere_pg
def test_control_negativo_not_null_con_default(catalogo_con_sonda):
    """Una NOT NULL CON default la rellena PostgreSQL: no es drift.

    Marcarla seria ruido que acabaria desactivando el detector entero.
    """
    hallazgos = comparar(
        [_writer(columnas=frozenset({"a", "b", "obligatoria"}))], catalogo_con_sonda
    )
    columnas = {c for h in hallazgos if h.clase == NOT_NULL_DRIFT for c in h.columnas}
    assert "con_default" not in columnas


# ───────────────────────────── barrido real


@requiere_pg
def test_el_catalogo_es_el_esquema_completo(catalogo):
    """Guardia contra certificar sobre una base vacia o a medio migrar.

    Sin esto, un DSN equivocado daria cero hallazgos y pareceria un exito.
    """
    assert len(catalogo) > 600, (
        f"solo {len(catalogo)} tablas: la base no tiene la cadena de migraciones "
        "aplicada; el resultado no certificaria nada"
    )
    for imprescindible in ("subscriptions", "audit_logs", "workspaces", "intent_scores"):
        assert imprescindible in catalogo, f"falta {imprescindible} en el catalogo"


@requiere_pg
def test_no_hay_drift_nuevo(catalogo):
    actuales = {_clave(h) for h in comparar(writers_del_repo(), catalogo)}
    nuevos = sorted(actuales - DRIFT_CONOCIDO)
    assert not nuevos, (
        "drift NUEVO contra PostgreSQL real — un INSERT que fallaria en "
        "produccion y que SQLite no detecta:\n  " + "\n  ".join(nuevos)
    )


@requiere_pg
def test_la_linea_base_no_esta_caducada(catalogo):
    """Si se arregla un writer, la linea base debe encogerse explicitamente.

    Una lista que conserva hallazgos ya resueltos deja de describir la realidad
    y con el tiempo nadie vuelve a mirarla.
    """
    actuales = {_clave(h) for h in comparar(writers_del_repo(), catalogo)}
    resueltos = sorted(DRIFT_CONOCIDO - actuales)
    assert not resueltos, (
        "estos hallazgos ya no ocurren; borrarlos de DRIFT_CONOCIDO:\n  "
        + "\n  ".join(resueltos)
    )


@requiere_pg
def test_ningun_on_conflict_sin_arbitro(catalogo):
    """El barrido real. Vale como evidencia porque el control positivo pasa."""
    hallazgos = [
        h for h in comparar(writers_del_repo(), catalogo) if h.clase == ON_CONFLICT_DRIFT
    ]
    assert not hallazgos, "\n".join(str(h) for h in hallazgos)


# ═══════════════════════════════════════════════════════════════════════════
# La regla de los indices unicos PARCIALES
# ═══════════════════════════════════════════════════════════════════════════
#
# El analizador los descartaba como arbitros, sin mas. La migracion 550 creo uno
# —pertenencia unica por workspace, `WHERE user_id IS NOT NULL AND user_id <> ''`,
# parcial para no romper las invitaciones pendientes— y desde entonces el guard
# daba por rota una escritura correcta. El «arreglo» evidente habria sido quitar
# el ON CONFLICT, que es exactamente lo que protege de la carrera que dejo tres
# workspaces con una sola pertenencia en produccion.
#
# La regla real de PostgreSQL es que un indice parcial SI sirve de arbitro,
# siempre que la sentencia repita su predicado. Eso es lo que se comprueba, en
# los dos sentidos: sin el WHERE tiene que seguir siendo un hallazgo.


def _esquema_con_indice_parcial():
    from tests._constraint_drift import TablaPg

    t = TablaPg(columnas={"workspace_id", "user_id", "email"})
    t.arbitros_parciales.add(frozenset({"workspace_id", "user_id"}))
    return {"workspace_members": t}


_INSERT = ("INSERT INTO workspace_members (workspace_id, user_id, email) "
           "VALUES (1,'2','x') ON CONFLICT (workspace_id, user_id) ")


def test_un_indice_parcial_vale_de_arbitro_si_se_repite_su_predicado():
    from tests._constraint_drift import analizar_writers, comparar

    w = analizar_writers(
        _INSERT + "WHERE user_id IS NOT NULL AND user_id != '' DO NOTHING", "x.py")
    assert w[0].conflict_con_predicado is True
    assert comparar(w, _esquema_con_indice_parcial()) == []


def test_un_indice_parcial_sin_predicado_sigue_siendo_un_hallazgo():
    """PostgreSQL rechaza ese INSERT. SQLite lo acepta sin rechistar.

    Es justo el tipo de divergencia que solo se ve certificando contra la base de
    verdad, y por eso este guard existe.
    """
    from tests._constraint_drift import analizar_writers, comparar

    w = analizar_writers(_INSERT + "DO NOTHING", "x.py")
    assert w[0].conflict_con_predicado is False
    hallazgos = comparar(w, _esquema_con_indice_parcial())
    assert len(hallazgos) == 1
    assert "PARCIAL" in hallazgos[0].motivo


def test_un_indice_total_no_necesita_predicado():
    """La regla nueva no puede haber aflojado el caso normal."""
    from tests._constraint_drift import TablaPg, analizar_writers, comparar

    t = TablaPg(columnas={"workspace_id", "user_id", "email"})
    t.arbitros.add(frozenset({"workspace_id", "user_id"}))
    assert comparar(analizar_writers(_INSERT + "DO NOTHING", "x.py"),
                    {"workspace_members": t}) == []
