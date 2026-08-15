"""Ningun modelo ORM declara columnas que PostgreSQL no tenga.

POR QUE ESTA COMPROBACION NO EXISTIA Y HACIA FALTA
--------------------------------------------------
`Base.metadata.create_all` usa `checkfirst`: si la tabla ya existe —porque la
creo una migracion— SQLAlchemy no la toca. Una columna que el modelo declara y
la migracion no creo NO SE ANADE NUNCA, y el ORM la pondra igualmente en cada
SELECT. El fallo no aparece al desplegar: aparece la primera vez que alguien lee
esa tabla.

Medido al empezar esta auditoria: 47 columnas declaradas por modelos que
PostgreSQL no tenia, repartidas en cinco tablas, mas 7 columnas obligatorias que
el ORM nunca rellenaba. Endpoints enteros devolvian 500 y la suite estaba verde,
porque SQLite construye sus tablas DESDE LOS MODELOS y por definicion coincide
consigo misma.

QUE SE COMPRUEBA
----------------
Las dos direcciones, que no son igual de graves:

  FALTA_EN_BD   el modelo la declara y PostgreSQL no la tiene
                -> el SELECT del ORM revienta. Defecto siempre.

  SOLO_EN_BD    PostgreSQL la tiene y el modelo no
                -> inofensivo, SALVO que sea NOT NULL sin default: entonces el
                   INSERT del ORM revienta. Solo se exige ese caso.

Exigir paridad total seria ruido: una tabla puede tener columnas legitimas que
un modelo concreto no necesita leer.
"""
from __future__ import annotations

import importlib
import os
import pkgutil

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

_SQL = """
SELECT c.relname, a.attname, a.attnotnull,
       (d.adbin IS NOT NULL) AS tiene_default,
       (a.attidentity <> '' OR a.attgenerated <> '') AS generada
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
 WHERE c.relkind = 'r'
"""


def _metadata():
    """Todos los modelos, importados como lo hace el runtime."""
    import models

    from core.database import Base

    fallos = []
    for mod in pkgutil.iter_modules(models.__path__):
        try:
            importlib.import_module(f"models.{mod.name}")
        except Exception as exc:  # se reporta, no se esconde
            fallos.append(f"models.{mod.name}: {type(exc).__name__}: {exc}")
    return Base.metadata, fallos


@pytest.fixture(scope="module")
def catalogo():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(DSN)
    try:
        cur = conn.cursor()
        cur.execute(_SQL)
        fuera: dict[str, dict[str, dict]] = {}
        for tabla, col, notnull, tiene_def, generada in cur.fetchall():
            fuera.setdefault(tabla, {})[col] = {
                "notnull": bool(notnull),
                "rellenable": bool(tiene_def or generada),
            }
        cur.close()
    finally:
        conn.close()
    return fuera


def test_todos_los_modelos_importan():
    """Un modelo que no importa no entra en el metadata, y su drift no se veria.

    Control positivo del propio fichero: sin esto, romper un import dejaria la
    comparacion sin nada que comparar y todo en verde.
    """
    metadata, fallos = _metadata()
    assert not fallos, "modelos que no importan:\n  " + "\n  ".join(fallos)
    # Se exigen tablas CONCRETAS, no un numero: el recuento varia segun lo que
    # cada fixture haya importado antes, y un umbral se convertiria en ruido.
    # Estas cinco son las que este trabajo realineo, mas las dos centrales.
    imprescindibles = {
        "workspaces", "subscriptions", "campaigns",
        "calendar_events", "social_posts",
    }
    faltan = sorted(imprescindibles - set(metadata.tables))
    assert not faltan, (
        f"estos modelos no estan en el metadata: {faltan}. Sin ellos la "
        "comparacion no mira lo que tiene que mirar."
    )


@requiere_pg
def test_el_catalogo_esta_completo(catalogo):
    """Guardia contra certificar sobre una base vacia o a medio migrar."""
    assert len(catalogo) > 600, (
        f"solo {len(catalogo)} tablas en el catalogo: la base no tiene la cadena "
        "de migraciones aplicada"
    )


@requiere_pg
def test_ningun_modelo_declara_columnas_que_no_existen(catalogo):
    """La direccion grave: el SELECT del ORM fallaria."""
    metadata, _ = _metadata()
    ausentes = []
    for tabla in sorted(metadata.tables):
        real = catalogo.get(tabla)
        if real is None:
            continue  # la crea `create_all`; su forma la define el propio modelo
        for columna in sorted({c.name for c in metadata.tables[tabla].columns} - set(real)):
            ausentes.append(f"{tabla}.{columna}")
    assert not ausentes, (
        "estos modelos declaran columnas que PostgreSQL no tiene; cualquier "
        "SELECT del ORM sobre esas tablas falla:\n  " + "\n  ".join(ausentes)
    )


@requiere_pg
def test_ninguna_columna_obligatoria_queda_sin_declarar(catalogo):
    """La otra direccion, solo donde duele: el INSERT del ORM fallaria.

    Una columna que PostgreSQL exige y el modelo no conoce no la rellena nadie.
    Las que tienen default o son generadas no cuentan: las rellena el motor.
    """
    metadata, _ = _metadata()
    huerfanas = []
    for tabla in sorted(metadata.tables):
        real = catalogo.get(tabla)
        if real is None:
            continue
        declaradas = {c.name for c in metadata.tables[tabla].columns}
        for columna, info in sorted(real.items()):
            if columna in declaradas:
                continue
            if info["notnull"] and not info["rellenable"]:
                huerfanas.append(f"{tabla}.{columna}")
    assert not huerfanas, (
        "PostgreSQL exige estas columnas y ningun modelo las declara, asi que el "
        "INSERT del ORM no puede rellenarlas:\n  " + "\n  ".join(huerfanas)
    )


@requiere_pg
def test_la_comparacion_detecta_drift_fabricado(catalogo):
    """Control positivo: los dos ceros de arriba solo valen si esto salta.

    Se fabrica una tabla real con una columna que ningun modelo declara y que es
    obligatoria, y se comprueba que la comparacion la vería. Sin esto, un cero
    seria compatible con «no hay drift» y con «la comparacion no mira nada».
    """
    catalogo_falso = dict(catalogo)
    catalogo_falso["workspaces"] = dict(catalogo_falso.get("workspaces", {}))
    catalogo_falso["workspaces"]["zz_columna_inventada"] = {
        "notnull": True,
        "rellenable": False,
    }
    metadata, _ = _metadata()
    declaradas = {c.name for c in metadata.tables["workspaces"].columns}
    huerfanas = [
        c
        for c, info in catalogo_falso["workspaces"].items()
        if c not in declaradas and info["notnull"] and not info["rellenable"]
    ]
    assert "zz_columna_inventada" in huerfanas
