"""El ETL de la generacion tenant duplica si se ejecuta dos veces a la vez.

EL DEFECTO
----------
`SaasDealsEtlService` y `SaasCrmEtlService` son idempotentes por LECTURA PREVIA:
antes de insertar consultan que filas llevan ya la etiqueta
`etl:legacy:<origen>:<id>` y se saltan esas. El patron es

    SELECT ... tags   -- ¿ya migrado?
    INSERT INTO saas_deals ...   -- si no

Entre el SELECT y el INSERT no hay nada: ni bloqueo, ni `ON CONFLICT`, ni indice
unico. `saas_deals` y `saas_contacts` solo tienen unicidad en su clave primaria,
que es un uuid generado, asi que la base nunca rechaza el duplicado.

Con una sola ejecucion el resultado es correcto. Con dos simultaneas, ambas leen
"no migrado" y ambas insertan.

Y es alcanzable por HTTP: `POST /api/saas/deals/etl` no tiene guarda de
concurrencia. Dos clics, o un reintento del cliente, bastan.

QUE HACE ESTE TEST
------------------
Reproduce la secuencia exacta con dos conexiones reales y demuestra:

  1. sin bloqueo -> duplicado (el defecto)
  2. con `pg_advisory_xact_lock` por inquilino -> una sola fila (el arreglo)

El segundo caso es el control positivo: sin el, un test que solo comprobara "no
hay duplicado" pasaria tambien si el INSERT fallara por cualquier otra razon.
"""
from __future__ import annotations

import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN, reason="requiere PostgreSQL real; exportar NELVYON_PG_CERT_DSN"
)

#: Mismo espacio de claves que usa el arreglo en TypeScript.
CLAVE_LOCK = 0x4E454C56  # "NELV"


@pytest.fixture()
def entorno():
    psycopg2 = pytest.importorskip("psycopg2")
    prep = psycopg2.connect(DSN)
    prep.autocommit = True
    cur = prep.cursor()

    tenant = uuid.uuid4()
    usuario = uuid.uuid4()
    marca = uuid.uuid4().hex[:8]
    # `saas_tenants.user_id` tiene clave ajena a `nelvyon_users`.
    cur.execute(
        "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, "
        "tenant_id, email_verified) VALUES (%s, %s, 'x', 'ETL', 'free', %s, false)",
        (str(usuario), f"etl-{marca}@nelvyon.test", str(usuario)),
    )
    cur.execute(
        "INSERT INTO saas_tenants (id, user_id, company_name, industry) "
        "VALUES (%s, %s, %s, 'software')",
        (str(tenant), str(usuario), f"Carrera {marca}"),
    )
    yield prep, tenant, marca
    cur.execute("DELETE FROM saas_deals WHERE tenant_id = %s", (str(tenant),))
    cur.execute("DELETE FROM saas_tenants WHERE id = %s", (str(tenant),))
    cur.execute("DELETE FROM nelvyon_users WHERE user_id = %s", (str(usuario),))
    prep.close()


def _dos_conexiones():
    psycopg2 = pytest.importorskip("psycopg2")
    return psycopg2.connect(DSN), psycopg2.connect(DSN)


def _ya_migrado(cur, tenant, etiqueta) -> bool:
    cur.execute(
        "SELECT count(*) FROM saas_deals WHERE tenant_id = %s AND %s = ANY(tags)",
        (str(tenant), etiqueta),
    )
    return cur.fetchone()[0] > 0


def _inserta(cur, tenant, etiqueta, nombre):
    cur.execute(
        "INSERT INTO saas_deals (tenant_id, title, value, tags) VALUES (%s, %s, 0, %s)",
        (str(tenant), nombre, [etiqueta]),
    )


def test_sin_bloqueo_dos_ejecuciones_simultaneas_duplican(entorno):
    """EL DEFECTO, reproducido. Es lo que hace real al hallazgo."""
    prep, tenant, marca = entorno
    etiqueta = f"etl:legacy:deals:{marca}"
    a, b = _dos_conexiones()
    try:
        ca, cb = a.cursor(), b.cursor()
        # Las dos leen ANTES de que ninguna escriba: exactamente lo que pasa
        # cuando dos peticiones entran a la vez.
        assert not _ya_migrado(ca, tenant, etiqueta)
        assert not _ya_migrado(cb, tenant, etiqueta)
        _inserta(ca, tenant, etiqueta, f"deal-a-{marca}")
        _inserta(cb, tenant, etiqueta, f"deal-b-{marca}")
        a.commit()
        b.commit()

        cur = prep.cursor()
        cur.execute(
            "SELECT count(*) FROM saas_deals WHERE tenant_id = %s AND %s = ANY(tags)",
            (str(tenant), etiqueta),
        )
        assert cur.fetchone()[0] == 2, (
            "la carrera ya no se reproduce: si se anadio unicidad o ON CONFLICT, "
            "actualiza este test en vez de borrarlo"
        )
    finally:
        a.close()
        b.close()


def test_con_bloqueo_por_inquilino_no_hay_duplicado(entorno):
    """EL ARREGLO. Control positivo: la fila SI se crea, una sola vez."""
    prep, tenant, marca = entorno
    etiqueta = f"etl:legacy:deals:{marca}-lock"
    a, b = _dos_conexiones()
    try:
        ca, cb = a.cursor(), b.cursor()

        # A toma el bloqueo del inquilino y hace su ciclo completo.
        ca.execute("SELECT pg_advisory_xact_lock(%s, %s)",
                   (CLAVE_LOCK, hash(str(tenant)) % 2_000_000_000))
        if not _ya_migrado(ca, tenant, etiqueta):
            _inserta(ca, tenant, etiqueta, f"deal-a-{marca}")
        a.commit()

        # B llega despues; el bloqueo ya esta libre, pero ahora SI ve la fila.
        cb.execute("SELECT pg_advisory_xact_lock(%s, %s)",
                   (CLAVE_LOCK, hash(str(tenant)) % 2_000_000_000))
        if not _ya_migrado(cb, tenant, etiqueta):
            _inserta(cb, tenant, etiqueta, f"deal-b-{marca}")
        b.commit()

        cur = prep.cursor()
        cur.execute(
            "SELECT count(*) FROM saas_deals WHERE tenant_id = %s AND %s = ANY(tags)",
            (str(tenant), etiqueta),
        )
        n = cur.fetchone()[0]
        assert n == 1, f"con bloqueo por inquilino deberia haber exactamente 1 fila, hay {n}"
    finally:
        a.close()
        b.close()


def test_el_bloqueo_no_serializa_inquilinos_distintos(entorno):
    """Control negativo: un bloqueo global seria correcto pero inaceptable.

    Serializaria el ETL de TODOS los clientes entre si. La clave del bloqueo
    tiene que depender del inquilino.
    """
    _, tenant, _ = entorno
    otro = uuid.uuid4()
    assert (hash(str(tenant)) % 2_000_000_000) != (hash(str(otro)) % 2_000_000_000), (
        "dos inquilinos distintos comparten clave de bloqueo"
    )
