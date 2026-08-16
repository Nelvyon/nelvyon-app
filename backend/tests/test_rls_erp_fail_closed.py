"""Las 33 tablas ERP dejan de conceder cuando falta el contexto.

QUÉ ESTABA MAL, Y POR QUÉ ERA PEOR QUE UN HUECO
------------------------------------------------
`520_erp_postgres_persistence.sql` creó una política por tabla con esta forma:

    USING (nelvyon_erp_tenant_text() IS NULL OR tenant_id = nelvyon_erp_tenant_text())

Esa primera rama invierte el sentido de RLS. Sin `app.tenant_id` fijado, la
política no deniega: **concede todo**, en las 33 tablas, a todo el mundo. El
comentario original lo asumía —«application MUST still filter tenant_id»—, o
sea que el aislamiento no lo daba la base sino la disciplina de quien
escribiera cada consulta.

El resto de esta serie de migraciones perseguía huecos que DENIEGAN en
silencio. Este era el contrario, y es el más grave de los dos: un hueco que
deniega se nota en cuanto alguien lo usa; uno que concede no se nota nunca.
Eran además las únicas 33 tablas del esquema donde activar RLS no habría
cambiado absolutamente nada.

`542_rls_erp_fail_closed.sql` quita la rama. La comparación por `tenant_id` se
queda igual.

EL CAMBIO DE CÓDIGO QUE TENÍA QUE IR CON ÉL
--------------------------------------------
Barriendo los 33 nombres por `backend/` y `apps/web/src`, el SQL contra estas
tablas sale de un solo dueño: `ErpDomainSnapshotStore.ts` (y su
`ErpRelationalMirror`, que corre dentro de sus transacciones). Todas las
escrituras ya fijaban el GUC. La lectura —`loadSnapshot`— no: consultaba fuera
de transacción y se apoyaba, sin saberlo, en la rama fail-open.

Cerrar la política sin arreglar eso habría dejado el ERP arrancando vacío para
todo el mundo, sin un solo error. Los dos cambios van juntos, y el último test
de este fichero vigila que no se separen.
"""
from __future__ import annotations

import os

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

requiere_pg = pytest.mark.skipif(
    not DSN,
    reason=(
        "requiere PostgreSQL con las migraciones aplicadas; "
        "levantar con scripts/pg-cert-db.mjs y exportar NELVYON_PG_CERT_DSN"
    ),
)

ROL = "nelvyon_rls_erp"
CLAVE = "erp-cert"
MARCA = "erpcert"

#: El ERP identifica al inquilino con una cadena libre —`ErpDomainSnapshotStore`
#: pasa `tenantId: string`—, no con el entero de workspace. La columna es TEXT y
#: `nelvyon_erp_tenant_text()` devuelve el GUC en crudo, así que la comparación
#: es texto contra texto y estos valores son representativos.
INQ_A = f"{MARCA}-inquilino-A"
INQ_B = f"{MARCA}-inquilino-B"

#: Dos de las 33, una de cada bloque de la 520.
TABLAS_PROBADAS = ("erp_suppliers", "erp_warehouses")

#: Las 33 que la 542 convierte. La lista vive aquí además de en el SQL para que
#: el test falle si la migración deja alguna atrás.
TABLAS_ERP = (
    "erp_assets", "erp_audit_events", "erp_boms", "erp_corrective_actions",
    "erp_domain_snapshots", "erp_field_work_orders", "erp_goods_receipts",
    "erp_idempotency_keys", "erp_incidents", "erp_inspections",
    "erp_inventory_products", "erp_locations", "erp_lots",
    "erp_maintenance_orders", "erp_manufacturing_orders", "erp_min_stock_rules",
    "erp_non_conformances", "erp_physical_counts", "erp_plm_documents",
    "erp_purchase_orders", "erp_purchase_requests", "erp_quality_plans",
    "erp_reservations", "erp_rfqs", "erp_routings", "erp_serials",
    "erp_stock_moves", "erp_supplier_returns", "erp_suppliers", "erp_timesheets",
    "erp_warehouses", "erp_work_centers", "saas_projects_erp",
)


def _dsn() -> str:
    return (DSN or "").replace("postgresql+asyncpg://", "postgresql://")


def _dsn_rol() -> str:
    return f"postgresql://{ROL}:{CLAVE}@{_dsn().split('@', 1)[1]}"


@pytest.fixture
async def escenario():
    """Dos inquilinos ERP con un proveedor y un almacén cada uno."""
    asyncpg = pytest.importorskip("asyncpg")
    admin = await asyncpg.connect(_dsn())

    async def limpiar():
        for tabla in TABLAS_PROBADAS:
            await admin.execute(f"DELETE FROM {tabla} WHERE tenant_id LIKE '{MARCA}%'")

    if await admin.fetchval("SELECT count(*) FROM pg_roles WHERE rolname=$1", ROL):
        await admin.execute(f"DROP OWNED BY {ROL}")
        await admin.execute(f"DROP ROLE {ROL}")
    await admin.execute(f"CREATE ROLE {ROL} LOGIN PASSWORD '{CLAVE}' NOSUPERUSER NOBYPASSRLS")
    await admin.execute(f"GRANT USAGE ON SCHEMA public, auth TO {ROL}")
    for tabla in TABLAS_PROBADAS:
        await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{tabla} TO {ROL}")

    await limpiar()
    for inquilino, etiqueta in ((INQ_A, "A"), (INQ_B, "B")):
        await admin.execute(
            "INSERT INTO erp_suppliers "
            "(id, tenant_id, name, category, payment_terms_note, status, created_at, "
            " contacts_json, updated_at) "
            "VALUES (gen_random_uuid(), $1, $2, 'general', '30d', 'active', NOW(), "
            "        '[]'::jsonb, NOW())",
            inquilino, f"{MARCA} proveedor {etiqueta}",
        )
        await admin.execute(
            "INSERT INTO erp_warehouses (id, tenant_id, code, name) "
            "VALUES (gen_random_uuid(), $1, $2, $3)",
            inquilino, f"{MARCA}-{etiqueta}", f"{MARCA} almacen {etiqueta}",
        )
    try:
        yield admin
    finally:
        await limpiar()
        await admin.execute(f"DROP OWNED BY {ROL}")
        await admin.execute(f"DROP ROLE IF EXISTS {ROL}")
        await admin.close()


@pytest.fixture
async def conn():
    asyncpg = pytest.importorskip("asyncpg")
    c = await asyncpg.connect(_dsn_rol())
    try:
        yield c
    finally:
        await c.close()


async def _contexto(c, inquilino: str) -> None:
    """Como lo fija `ErpDomainSnapshotStore.setTenantGuc`: `app.tenant_id` con
    `set_config(..., true)`, es decir con ámbito de transacción."""
    await c.execute("SELECT set_config('app.tenant_id', $1, true)", inquilino)


async def _nombres(c, tabla: str) -> set[str]:
    filas = await c.fetch(f"SELECT name FROM {tabla} WHERE name LIKE '{MARCA}%'")
    return {f["name"] for f in filas}


# ═══════════════════════════════════════════════════════════════════════════
# POSITIVO — que fail-closed no signifique «datos que desaparecen»
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("tabla", TABLAS_PROBADAS)
async def test_con_contexto_el_inquilino_ve_y_escribe_lo_suyo(escenario, conn, tabla):
    """El control que impide que cerrar la política rompa el producto.

    Es el mismo riesgo que motivó arreglar `loadSnapshot` en el mismo cambio:
    una política demasiado estricta no da error, da vacío.
    """
    async with conn.transaction():
        await _contexto(conn, INQ_A)
        vistos = await _nombres(conn, tabla)
        assert len(vistos) == 1 and " A" in next(iter(vistos)), (
            f"{tabla}: el inquilino no ve lo suyo con contexto correcto: {vistos}"
        )

        if tabla == "erp_suppliers":
            await conn.execute(
                "INSERT INTO erp_suppliers (id, tenant_id, name, category, "
                " payment_terms_note, status, created_at, contacts_json, updated_at) "
                "VALUES (gen_random_uuid(), $1, $2, 'general', '30d', 'active', NOW(), "
                "        '[]'::jsonb, NOW())",
                INQ_A, f"{MARCA} proveedor A nuevo",
            )
        else:
            await conn.execute(
                "INSERT INTO erp_warehouses (id, tenant_id, code, name) "
                "VALUES (gen_random_uuid(), $1, $2, $3)",
                INQ_A, f"{MARCA}-A2", f"{MARCA} almacen A nuevo",
            )
        assert len(await _nombres(conn, tabla)) == 2


@requiere_pg
@pytest.mark.asyncio
async def test_con_contexto_se_puede_actualizar_y_borrar_lo_propio(escenario, conn):
    """Las políticas ERP son `FOR ALL`: el ciclo completo tiene que funcionar."""
    admin = escenario
    async with conn.transaction():
        await _contexto(conn, INQ_A)
        await conn.execute(
            f"UPDATE erp_suppliers SET status='inactive' WHERE name = '{MARCA} proveedor A'"
        )
        await conn.execute(f"DELETE FROM erp_warehouses WHERE name = '{MARCA} almacen A'")

    assert await admin.fetchval(
        f"SELECT status FROM erp_suppliers WHERE name = '{MARCA} proveedor A'"
    ) == "inactive"
    assert await admin.fetchval(
        f"SELECT count(*) FROM erp_warehouses WHERE name = '{MARCA} almacen A'"
    ) == 0


# ═══════════════════════════════════════════════════════════════════════════
# NEGATIVO — sin contexto, lo que ANTES lo abría todo
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
@pytest.mark.parametrize("tabla", TABLAS_PROBADAS)
async def test_sin_contexto_no_se_ve_nada(escenario, conn, tabla):
    """Este es el test que la versión anterior de la política NO pasaba.

    Con `nelvyon_erp_tenant_text() IS NULL OR ...`, una conexión sin contexto
    veía las filas de TODOS los inquilinos. Ahora no ve ninguna.
    """
    vistos = await _nombres(conn, tabla)
    assert vistos == set(), (
        f"{tabla}: sin contexto se ven {len(vistos)} filas. La politica sigue "
        "concediendo cuando falta el inquilino, que es lo contrario de aislar."
    )


@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_puede_escribir(escenario, conn):
    """Escribir sin inquilino tiene que fallar con error, no colarse en la
    tabla de cualquiera."""
    async with conn.transaction():
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO erp_warehouses (id, tenant_id, code, name) "
                "VALUES (gen_random_uuid(), $1, $2, $3)",
                INQ_A, f"{MARCA}-X", f"{MARCA} almacen sin contexto",
            )


@requiere_pg
@pytest.mark.asyncio
async def test_sin_contexto_no_se_puede_modificar_ni_borrar(escenario, conn):
    """UPDATE y DELETE sin contexto no fallan: no encuentran filas. Antes las
    encontraban TODAS, así que un `UPDATE ... WHERE status='active'` mal acotado
    habría tocado el ERP de todos los inquilinos a la vez."""
    admin = escenario
    async with conn.transaction():
        await conn.execute("UPDATE erp_suppliers SET status='inactive' WHERE status='active'")
        await conn.execute(f"DELETE FROM erp_warehouses WHERE name LIKE '{MARCA}%'")

    assert await admin.fetchval(
        f"SELECT count(*) FROM erp_warehouses WHERE tenant_id LIKE '{MARCA}%'"
    ) == 2, "sin contexto se borraron filas de inquilinos reales"
    assert await admin.fetchval(
        f"SELECT count(*) FROM erp_suppliers WHERE tenant_id LIKE '{MARCA}%' AND status='active'"
    ) == 2, "sin contexto se modificaron filas de inquilinos reales"


# ═══════════════════════════════════════════════════════════════════════════
# CRUZADO — A contra B
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_un_inquilino_no_ve_ni_toca_el_erp_de_otro(escenario, conn):
    """Las cuatro operaciones. El INSERT bajo el inquilino ajeno falla con error
    de política; UPDATE y DELETE no fallan y por eso se miden desde el admin."""
    admin = escenario
    async with conn.transaction():
        await _contexto(conn, INQ_A)
        assert f"{MARCA} proveedor B" not in await _nombres(conn, "erp_suppliers")
        assert f"{MARCA} almacen B" not in await _nombres(conn, "erp_warehouses")

        await conn.execute(
            f"UPDATE erp_suppliers SET status='inactive' WHERE name = '{MARCA} proveedor B'"
        )
        await conn.execute(f"DELETE FROM erp_warehouses WHERE name = '{MARCA} almacen B'")

    async with conn.transaction():
        await _contexto(conn, INQ_A)
        with pytest.raises(Exception, match="row-level security"):
            await conn.execute(
                "INSERT INTO erp_warehouses (id, tenant_id, code, name) "
                "VALUES (gen_random_uuid(), $1, $2, $3)",
                INQ_B, f"{MARCA}-INTRUSO", f"{MARCA} almacen invasor",
            )

    fila = await admin.fetchrow(
        f"SELECT status FROM erp_suppliers WHERE name = '{MARCA} proveedor B'"
    )
    assert fila is not None and fila["status"] == "active", "A modifico el ERP de B"
    assert await admin.fetchval(
        f"SELECT count(*) FROM erp_warehouses WHERE name = '{MARCA} almacen B'"
    ) == 1, "A borro el almacen de B"


# ═══════════════════════════════════════════════════════════════════════════
# GUARDS — que el patrón no vuelva
# ═══════════════════════════════════════════════════════════════════════════

@requiere_pg
@pytest.mark.asyncio
async def test_ninguna_politica_del_esquema_concede_cuando_falta_el_contexto(escenario):
    """Cuenta, sobre el esquema entero, las políticas cuyo `USING` empieza por
    «si no hay contexto, pasa».

    Eran 33. Tienen que ser cero, y el test falla si CRECE: es la forma más
    fácil de «arreglar» una denegación —añadir `IS NULL OR` delante— y también
    la de desactivar RLS sin que lo parezca.
    """
    admin = escenario
    abiertas = [
        f"{f['tablename']}.{f['policyname']}"
        for f in await admin.fetch(
            "SELECT tablename, policyname FROM pg_policies "
            "WHERE schemaname='public' AND coalesce(qual,'') LIKE '%IS NULL) OR%' "
            "ORDER BY 1, 2"
        )
    ]
    assert abiertas == [], (
        f"{len(abiertas)} politicas conceden cuando falta el contexto: {abiertas}. "
        "Una politica que abre sin inquilino no aisla nada, y a diferencia de un "
        "hueco que deniega, esto no se nota nunca."
    )


@requiere_pg
@pytest.mark.asyncio
async def test_las_33_tablas_erp_quedaron_acotadas_por_inquilino(escenario):
    """La conversión, tabla por tabla: ninguna se quedó atrás y ninguna perdió
    su política por el camino —quedarse con RLS y sin política sería cambiar un
    fallo por el opuesto."""
    admin = escenario
    filas = {
        f["tablename"]: (f["qual"], f["with_check"])
        for f in await admin.fetch(
            "SELECT tablename, qual, with_check FROM pg_policies "
            "WHERE schemaname='public' AND policyname LIKE '%\\_erp\\_tenant'"
        )
    }
    esperado = "(tenant_id = nelvyon_erp_tenant_text())"
    faltan = [t for t in TABLAS_ERP if t not in filas]
    assert faltan == [], f"tablas ERP sin su politica tras la 542: {faltan}"
    for tabla in TABLAS_ERP:
        qual, check = filas[tabla]
        assert qual == esperado, f"{tabla}: USING inesperado -> {qual}"
        assert check == esperado, f"{tabla}: WITH CHECK inesperado -> {check}"


@requiere_pg
@pytest.mark.asyncio
async def test_cdp_identities_ya_no_tiene_una_politica_abierta(escenario):
    """La misma avería con otra forma, encontrada barriendo el esquema entero.

    La 507 dejó `cdp_identities_public FOR ALL USING (true)` junto a
    `cdp_identities_tenant`. Las políticas permisivas se combinan con OR, así que
    la abierta no añadía un caso: se comía entera a la que acotaba, para SELECT,
    UPDATE y DELETE. Y `cdp_identities` guarda identidades del CDP —`user_id`,
    `anonymous_id` y un `traits` jsonb con datos personales— de todos los
    inquilinos.

    Es peor que las 33 del ERP: aquéllas al menos aislaban cuando había
    contexto; ésta abría siempre. Se comprueba que se retiró y que la que acota
    sigue ahí — quitar las dos habría cambiado una avería por la contraria.
    """
    admin = escenario
    politicas = {
        f["policyname"]: (f["cmd"], f["qual"])
        for f in await admin.fetch(
            "SELECT policyname, cmd, qual FROM pg_policies "
            "WHERE schemaname='public' AND tablename='cdp_identities'"
        )
    }
    assert "cdp_identities_public" not in politicas, (
        "cdp_identities vuelve a tener una politica FOR ALL USING (true): anula "
        "por OR a cdp_identities_tenant y expone datos personales de todos los "
        "inquilinos"
    )
    assert politicas.get("cdp_identities_tenant", (None, None))[1] == (
        "(workspace_id = current_tenant_id())"
    ), "cdp_identities se quedo sin la politica que acota por inquilino"


@requiere_pg
@pytest.mark.asyncio
async def test_ninguna_politica_abierta_convive_con_una_que_acota(escenario):
    """El patrón general del fallo anterior, no solo su instancia.

    Una política permisiva `USING (true)` que cubre EL MISMO VERBO que otra que
    filtra es siempre un error: PostgreSQL combina las permisivas con OR, así
    que la abierta gana y la que acota deja de existir. Eso era
    `cdp_identities_public`, `FOR ALL USING (true)` sobre la misma tabla que
    `cdp_identities_tenant`.

    La comparación es por verbo a propósito. Una `USING (true)` de SELECT
    conviviendo con una de UPDATE acotada no se anulan: son operaciones
    distintas. Es el caso de `feedback_items` —tablón público de sugerencias que
    todos leen y solo su autor edita—, y contarlo como conflicto sería una
    falsa alarma que acabaría enseñando a ignorar este test.
    """
    admin = escenario
    conflictos = [
        f"{f['tablename']}.{f['policyname']} ({f['cmd']}) anula a {f['tapada']}"
        for f in await admin.fetch(
            "SELECT p.tablename, p.policyname, p.cmd, q.policyname AS tapada "
            "FROM pg_policies p JOIN pg_policies q "
            "  ON q.schemaname = p.schemaname AND q.tablename = p.tablename "
            " AND q.policyname <> p.policyname "
            "WHERE p.schemaname='public' AND p.permissive='PERMISSIVE' "
            "  AND q.permissive='PERMISSIVE' "
            "  AND btrim(coalesce(p.qual,'')) = 'true' "
            "  AND btrim(coalesce(q.qual,'')) NOT IN ('', 'true') "
            "  AND (p.cmd = q.cmd OR p.cmd = 'ALL' OR q.cmd = 'ALL') "
            "ORDER BY 1, 2"
        )
    ]
    assert conflictos == [], (
        f"politicas abiertas que anulan por OR a otra que acota: {conflictos}"
    )


def test_la_lectura_del_erp_fija_el_contexto_antes_de_consultar():
    """Sobre el código, no sobre la base: el cambio que tenía que acompañar a la
    542.

    `loadSnapshot` era la única ruta de `ErpDomainSnapshotStore` que consultaba
    sin fijar `app.tenant_id`. Funcionaba porque la política vieja abría cuando
    faltaba el contexto. Con la política cerrada, esa misma consulta devolvería
    cero filas y el ERP arrancaría vacío para todo el mundo, sin error.

    Si alguien revierte este `set_config` sin revertir la migración, el producto
    se rompe en silencio. Por eso se vigila aquí.
    """
    from pathlib import Path

    fuente = (
        Path(__file__).resolve().parent.parent / "agency" / "erp" / "ErpDomainSnapshotStore.ts"
    ).read_text(encoding="utf-8")

    inicio = fuente.index("async loadSnapshot(")
    cuerpo = fuente[inicio:inicio + 900]
    assert "setTenantGuc" in cuerpo, (
        "loadSnapshot volvio a consultar sin fijar app.tenant_id. Con las "
        "politicas ERP en fail-closed (migracion 542) eso devuelve cero filas."
    )
    assert "withTransaction" in cuerpo, (
        "set_config(..., true) tiene ambito de transaccion: fuera de una, no "
        "aplica a la consulta siguiente"
    )
