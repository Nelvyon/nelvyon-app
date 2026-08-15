"""Dos ejecuciones simultaneas del ETL no pueden duplicar un registro legado.

EL DEFECTO
----------
`SaasDealsEtlService` era idempotente por LECTURA PREVIA:

    SELECT DISTINCT source FROM saas_deals WHERE source = ANY($1)   -- ¿migrado?
    INSERT INTO saas_deals (..., source, ...) VALUES ...            -- si no

Entre esas dos sentencias no habia nada: ni bloqueo, ni `ON CONFLICT`, ni
unicidad. La clave primaria es un uuid generado, asi que la base nunca rechazaba
el duplicado. Con dos ejecuciones simultaneas, ambas leian "no migrado" y ambas
insertaban.

Reproducido con dos conexiones reales: DOS filas para un unico registro legado.

EL ARREGLO
----------
Indice unico PARCIAL sobre `source WHERE source LIKE 'etl:legacy_id:%'`
(migracion 536) mas `ON CONFLICT DO NOTHING` en los dos caminos de escritura del
ETL —el lote y el reintento fila a fila—.

Se eligio frente al advisory lock por inquilino porque cubre TODOS los caminos
de escritura y no solo el que se acuerde de tomar el lock; sobrevive a reinicios
y reintentos; no serializa nada; y no tiene orden de adquisicion, luego no puede
producir interbloqueos. Ver la cabecera de la migracion 536.

La unicidad no es un parche: es la regla que el propio ETL ya intentaba imponer
a mano. `source` guarda `etl:legacy_id:<origen>:<id>`, identificador del registro
legado, y los `<id>` son claves primarias de tablas unicas.

QUE SE PRUEBA AQUI
------------------
Con concurrencia REAL —dos conexiones, sin mocks que eliminen justo lo que se
quiere certificar—:

    concurrencia mismo inquilino   -> exactamente 1 efecto logico
    secuencial repetido            -> idempotente
    inquilinos A y B a la vez      -> ambos progresan
    fallo/rollback de una          -> ni estado parcial ni lock huerfano
    reintento posterior            -> resultado correcto
    aislamiento A/B                -> cero contaminacion cruzada
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
    c = psycopg2.connect(DSN)
    return c


@pytest.fixture()
def entorno():
    """Dos inquilinos reales, para poder distinguir serializacion de bloqueo."""
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
            (str(u), f"etl-{quien}-{marca}@nelvyon.test", str(u)),
        )
        cur.execute(
            "INSERT INTO saas_tenants (id, user_id, company_name, industry) "
            "VALUES (%s, %s, %s, 'software')",
            (str(t), str(u), f"ETL {quien} {marca}"),
        )
        tenants.append(t)
        usuarios.append(u)
    yield prep, tenants[0], tenants[1], marca
    for t in tenants:
        cur.execute("DELETE FROM saas_deals WHERE tenant_id = %s", (str(t),))
        cur.execute("DELETE FROM saas_tenants WHERE id = %s", (str(t),))
    for u in usuarios:
        cur.execute("DELETE FROM nelvyon_users WHERE user_id = %s", (str(u),))
    prep.close()


def _ya_migrado(cur, tags: list[str]) -> set[str]:
    """La lectura previa que hace el ETL, tal cual."""
    cur.execute("SELECT DISTINCT source FROM saas_deals WHERE source = ANY(%s::text[])", (tags,))
    return {r[0] for r in cur.fetchall()}


def _inserta(cur, tenant, tag, titulo):
    """El INSERT del ETL, con su `ON CONFLICT` real."""
    cur.execute(
        "INSERT INTO saas_deals (tenant_id, title, value, source) VALUES (%s, %s, 0, %s) "
        "ON CONFLICT (source) WHERE source LIKE 'etl:legacy_id:%%' DO NOTHING "
        "RETURNING id",
        (str(tenant), titulo, tag),
    )
    return cur.fetchone() is not None


def _cuantas(prep, tag) -> int:
    cur = prep.cursor()
    cur.execute("SELECT count(*) FROM saas_deals WHERE source = %s", (tag,))
    return cur.fetchone()[0]


def test_el_indice_unico_parcial_existe(entorno):
    """Control positivo: sin el indice, todo lo demas pasaria por casualidad."""
    prep, *_ = entorno
    cur = prep.cursor()
    cur.execute(
        "SELECT indexdef FROM pg_indexes "
        "WHERE tablename = 'saas_deals' AND indexname = 'ux_saas_deals_etl_legacy_source'"
    )
    fila = cur.fetchone()
    assert fila, "falta ux_saas_deals_etl_legacy_source: la migracion 536 no se aplico"
    assert "UNIQUE" in fila[0] and "etl:legacy_id:" in fila[0], (
        f"el indice existe pero no es el esperado: {fila[0]}"
    )


def test_concurrencia_mismo_inquilino_produce_un_unico_efecto(entorno):
    """LA PROPIEDAD. Antes del arreglo esto daba 2 filas."""
    prep, ta, _, marca = entorno
    tag = f"{PREFIJO}deals:{marca}-conc"
    a, b = _conecta(), _conecta()
    try:
        ca, cb = a.cursor(), b.cursor()
        # Las dos leen ANTES de que ninguna escriba: la carrera exacta.
        assert not _ya_migrado(ca, [tag])
        assert not _ya_migrado(cb, [tag])
        gano_a = _inserta(ca, ta, tag, "deal-a")
        a.commit()
        gano_b = _inserta(cb, ta, tag, "deal-b")
        b.commit()

        assert _cuantas(prep, tag) == 1, "se duplico el registro legado"
        assert gano_a != gano_b, (
            "exactamente una ejecucion debe insertar; "
            f"a={gano_a} b={gano_b}"
        )
    finally:
        a.close()
        b.close()


def test_secuencial_repetido_es_idempotente(entorno):
    """Tres pasadas seguidas, una sola fila."""
    prep, ta, _, marca = entorno
    tag = f"{PREFIJO}deals:{marca}-seq"
    for _ in range(3):
        c = _conecta()
        try:
            cur = c.cursor()
            if not _ya_migrado(cur, [tag]):
                _inserta(cur, ta, tag, "deal-seq")
            c.commit()
        finally:
            c.close()
    assert _cuantas(prep, tag) == 1


def test_dos_inquilinos_progresan_a_la_vez(entorno):
    """Control negativo del advisory lock global: A y B no se estorban.

    Si la solucion serializara por algo que no fuera el registro legado, este
    test seguiria pasando pero el anterior tambien — por eso importa que aqui
    AMBOS inserten, no solo que no fallen.
    """
    prep, ta, tb, marca = entorno
    tag_a = f"{PREFIJO}deals:{marca}-ta"
    tag_b = f"{PREFIJO}deals:{marca}-tb"
    a, b = _conecta(), _conecta()
    try:
        ca, cb = a.cursor(), b.cursor()
        # Intercalados a proposito: si hubiera un lock global, uno esperaria.
        assert _inserta(ca, ta, tag_a, "deal-ta")
        assert _inserta(cb, tb, tag_b, "deal-tb")
        a.commit()
        b.commit()
        assert _cuantas(prep, tag_a) == 1
        assert _cuantas(prep, tag_b) == 1
    finally:
        a.close()
        b.close()


def test_rollback_no_deja_estado_parcial_ni_bloqueo(entorno):
    """Si una ejecucion revienta, no debe dejar nada: ni fila, ni lock huerfano.

    Con un advisory lock de sesion, una conexion muerta podia retenerlo. Con un
    indice no hay nada que liberar, y esto lo demuestra: tras el rollback la
    siguiente ejecucion inserta sin esperar.
    """
    prep, ta, _, marca = entorno
    tag = f"{PREFIJO}deals:{marca}-rb"
    a = _conecta()
    try:
        ca = a.cursor()
        _inserta(ca, ta, tag, "deal-abortado")
        a.rollback()
    finally:
        a.close()
    assert _cuantas(prep, tag) == 0, "el rollback dejo estado parcial"

    # Y el reintento posterior funciona, sin bloquearse.
    b = _conecta()
    try:
        cb = b.cursor()
        assert _inserta(cb, ta, tag, "deal-reintento")
        b.commit()
    finally:
        b.close()
    assert _cuantas(prep, tag) == 1


def test_el_indice_no_afecta_a_los_deals_que_no_son_del_etl(entorno):
    """Control negativo imprescindible.

    `source` es texto libre para los otros escritores —`SaasDealsService` lo
    recibe como parametro y HubSpot escribe `source:hubspot`—. Dos deals creados
    a mano con el mismo `source` son legitimos y NO deben chocar. Un indice
    unico sin la clausula parcial habria roto la creacion normal.
    """
    prep, ta, _, marca = entorno
    cur = prep.cursor()
    for i in (1, 2):
        cur.execute(
            "INSERT INTO saas_deals (tenant_id, title, value, source) VALUES (%s, %s, 0, %s)",
            (str(ta), f"manual-{i}-{marca}", "source:hubspot"),
        )
    cur.execute(
        "SELECT count(*) FROM saas_deals WHERE tenant_id = %s AND source = 'source:hubspot'",
        (str(ta),),
    )
    assert cur.fetchone()[0] == 2, "el indice bloquea deals que no son del ETL"


def test_aislamiento_ab_sin_contaminacion(entorno):
    """El mismo registro legado no puede acabar en el inquilino equivocado."""
    prep, ta, tb, marca = entorno
    tag = f"{PREFIJO}deals:{marca}-iso"
    a = _conecta()
    try:
        assert _inserta(a.cursor(), ta, tag, "deal-de-a")
        a.commit()
    finally:
        a.close()
    cur = prep.cursor()
    cur.execute("SELECT tenant_id FROM saas_deals WHERE source = %s", (tag,))
    duenos = {str(r[0]) for r in cur.fetchall()}
    assert duenos == {str(ta)}, f"la fila no pertenece solo a A: {duenos}"
    cur.execute("SELECT count(*) FROM saas_deals WHERE tenant_id = %s", (str(tb),))
    assert cur.fetchone()[0] == 0, "B ha recibido filas que no son suyas"
