"""El ETL de contactos tenia la misma carrera que el de deals, y se cierra igual.

EL DEFECTO
----------
`SaasCrmEtlService` deduplica leyendo antes de escribir:

    SELECT tags FROM saas_contacts
     WHERE EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE 'etl:legacy_id:%')
    INSERT INTO saas_contacts (..., tags, ...) VALUES ...

Entre ambas no hay nada. Es la misma clase de carrera que se cerro en
`saas_deals` con la migracion 536, pero aqui la clave de deduplicacion NO es una
columna: vive dentro del array `tags`. `saas_contacts` no tiene columna `source`.

Que la clave este en un array no cambia la invariante del dominio —un registro
legado produce como mucho un contacto migrado—, solo como hay que expresarla.

EL ARREGLO
----------
Migracion 537: una funcion IMMUTABLE que extrae la etiqueta del array, y un
indice unico PARCIAL sobre esa expresion. Igual que en deals, se prefiere al
advisory lock porque cubre TODOS los escritores, sobrevive a reinicios y no
serializa nada.

Es parcial —solo donde hay etiqueta de ETL— porque los contactos creados a mano
no llevan ninguna y no deben chocar entre si. Hay control negativo que lo prueba.
"""
from __future__ import annotations

import os
import uuid

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

pytestmark = pytest.mark.skipif(
    not DSN, reason="requiere PostgreSQL real; exportar NELVYON_PG_CERT_DSN"
)

PREFIJO = "etl:legacy_id:"


def _conecta():
    psycopg2 = pytest.importorskip("psycopg2")
    return psycopg2.connect(DSN)


@pytest.fixture()
def entorno():
    psycopg2 = pytest.importorskip("psycopg2")
    prep = psycopg2.connect(DSN)
    prep.autocommit = True
    cur = prep.cursor()
    marca = uuid.uuid4().hex[:8]
    tenants, usuarios = [], []
    for quien in ("a", "b"):
        u, t = uuid.uuid4(), uuid.uuid4()
        cur.execute(
            "INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan, "
            "tenant_id, email_verified) VALUES (%s, %s, 'x', 'ETL', 'free', %s, false)",
            (str(u), f"crmetl-{quien}-{marca}@nelvyon.test", str(u)),
        )
        cur.execute(
            "INSERT INTO saas_tenants (id, user_id, company_name, industry) "
            "VALUES (%s, %s, %s, 'software')",
            (str(t), str(u), f"CRM ETL {quien} {marca}"),
        )
        tenants.append(t)
        usuarios.append(u)
    yield prep, tenants[0], tenants[1], marca
    for t in tenants:
        cur.execute("DELETE FROM saas_contacts WHERE tenant_id = %s", (str(t),))
        cur.execute("DELETE FROM saas_tenants WHERE id = %s", (str(t),))
    for u in usuarios:
        cur.execute("DELETE FROM nelvyon_users WHERE user_id = %s", (str(u),))
    prep.close()


def _ya_migrado(cur, etiqueta) -> bool:
    """La lectura previa del ETL, sobre el array."""
    cur.execute(
        "SELECT count(*) FROM saas_contacts WHERE %s = ANY(tags)", (etiqueta,)
    )
    return cur.fetchone()[0] > 0


def _inserta(cur, tenant, etiqueta, nombre):
    """El INSERT del ETL, con el `ON CONFLICT` sobre la expresion indexada."""
    cur.execute(
        "INSERT INTO saas_contacts (tenant_id, name, tags) VALUES (%s, %s, %s) "
        "ON CONFLICT (nelvyon_etl_legacy_tag(tags)) "
        "WHERE nelvyon_etl_legacy_tag(tags) IS NOT NULL DO NOTHING "
        "RETURNING id",
        (str(tenant), nombre, [etiqueta]),
    )
    return cur.fetchone() is not None


def _cuantos(prep, etiqueta) -> int:
    cur = prep.cursor()
    cur.execute("SELECT count(*) FROM saas_contacts WHERE %s = ANY(tags)", (etiqueta,))
    return cur.fetchone()[0]


def test_la_funcion_y_el_indice_existen(entorno):
    """Control positivo: sin ellos todo lo demas pasaria por casualidad."""
    prep, *_ = entorno
    cur = prep.cursor()
    cur.execute("SELECT count(*) FROM pg_proc WHERE proname = 'nelvyon_etl_legacy_tag'")
    assert cur.fetchone()[0] >= 1, "falta la funcion: la migracion 537 no se aplico"
    cur.execute(
        "SELECT indexdef FROM pg_indexes "
        "WHERE tablename = 'saas_contacts' AND indexname = 'ux_saas_contacts_etl_legacy'"
    )
    fila = cur.fetchone()
    assert fila and "UNIQUE" in fila[0], "falta el indice unico de saas_contacts"


def test_la_funcion_extrae_la_etiqueta_y_solo_esa(entorno):
    """Control negativo del extractor: no puede confundir etiquetas normales."""
    prep, *_ = entorno
    cur = prep.cursor()
    cur.execute(
        "SELECT nelvyon_etl_legacy_tag(ARRAY['vip','etl:legacy_id:contacts:7','cliente'])"
    )
    assert cur.fetchone()[0] == "etl:legacy_id:contacts:7"
    cur.execute("SELECT nelvyon_etl_legacy_tag(ARRAY['vip','cliente'])")
    assert cur.fetchone()[0] is None, "extrae etiqueta donde no hay ninguna del ETL"
    cur.execute("SELECT nelvyon_etl_legacy_tag(NULL)")
    assert cur.fetchone()[0] is None


def test_concurrencia_mismo_inquilino_produce_un_unico_efecto(entorno):
    """LA PROPIEDAD. Sin el indice esto daba 2 filas."""
    prep, ta, _, marca = entorno
    etiqueta = f"{PREFIJO}contacts:{marca}-conc"
    a, b = _conecta(), _conecta()
    try:
        ca, cb = a.cursor(), b.cursor()
        assert not _ya_migrado(ca, etiqueta)
        assert not _ya_migrado(cb, etiqueta)
        gano_a = _inserta(ca, ta, etiqueta, "contacto-a")
        a.commit()
        gano_b = _inserta(cb, ta, etiqueta, "contacto-b")
        b.commit()
        assert _cuantos(prep, etiqueta) == 1, "se duplico el registro legado"
        assert gano_a != gano_b, f"debe insertar exactamente una: a={gano_a} b={gano_b}"
    finally:
        a.close()
        b.close()


def test_secuencial_repetido_es_idempotente(entorno):
    prep, ta, _, marca = entorno
    etiqueta = f"{PREFIJO}contacts:{marca}-seq"
    for _ in range(3):
        c = _conecta()
        try:
            cur = c.cursor()
            if not _ya_migrado(cur, etiqueta):
                _inserta(cur, ta, etiqueta, "contacto-seq")
            c.commit()
        finally:
            c.close()
    assert _cuantos(prep, etiqueta) == 1


def test_dos_inquilinos_progresan_a_la_vez(entorno):
    """Control negativo del lock global: A y B no se estorban."""
    prep, ta, tb, marca = entorno
    ea, eb = f"{PREFIJO}contacts:{marca}-ta", f"{PREFIJO}contacts:{marca}-tb"
    a, b = _conecta(), _conecta()
    try:
        assert _inserta(a.cursor(), ta, ea, "c-ta")
        assert _inserta(b.cursor(), tb, eb, "c-tb")
        a.commit()
        b.commit()
        assert _cuantos(prep, ea) == 1 and _cuantos(prep, eb) == 1
    finally:
        a.close()
        b.close()


def test_rollback_no_deja_estado_parcial(entorno):
    prep, ta, _, marca = entorno
    etiqueta = f"{PREFIJO}contacts:{marca}-rb"
    a = _conecta()
    try:
        _inserta(a.cursor(), ta, etiqueta, "abortado")
        a.rollback()
    finally:
        a.close()
    assert _cuantos(prep, etiqueta) == 0
    b = _conecta()
    try:
        assert _inserta(b.cursor(), ta, etiqueta, "reintento")
        b.commit()
    finally:
        b.close()
    assert _cuantos(prep, etiqueta) == 1


def test_los_contactos_sin_etiqueta_de_etl_no_chocan(entorno):
    """Control negativo imprescindible.

    Los contactos creados a mano no llevan etiqueta de ETL. Un indice sin la
    clausula parcial los habria hecho colisionar entre si —todos con NULL— y
    habria roto la creacion normal de contactos.
    """
    prep, ta, _, marca = entorno
    cur = prep.cursor()
    for i in (1, 2, 3):
        cur.execute(
            "INSERT INTO saas_contacts (tenant_id, name, tags) VALUES (%s, %s, %s)",
            (str(ta), f"manual-{i}-{marca}", ["vip", "cliente"]),
        )
    cur.execute(
        "SELECT count(*) FROM saas_contacts WHERE tenant_id = %s AND 'vip' = ANY(tags)",
        (str(ta),),
    )
    assert cur.fetchone()[0] == 3, "el indice bloquea contactos ajenos al ETL"
