-- Las 33 tablas ERP dejan de abrirse solas cuando falta el contexto.
--
-- EL PROBLEMA
-- -----------
-- `520_erp_postgres_persistence.sql` creo una politica por tabla, todas con la
-- misma forma:
--
--     USING      (nelvyon_erp_tenant_text() IS NULL OR tenant_id = nelvyon_erp_tenant_text())
--     WITH CHECK (nelvyon_erp_tenant_text() IS NULL OR tenant_id = nelvyon_erp_tenant_text())
--
-- Esa primera rama invierte el sentido de RLS. Cuando `app.tenant_id` no esta
-- fijado, la politica no deniega: CONCEDE TODO, a todos, en las 33 tablas. El
-- comentario original lo decia con todas las letras —«application MUST still
-- filter tenant_id»—, o sea que el aislamiento no lo daba la politica sino la
-- disciplina de quien escribiera la consulta.
--
-- Mientras la aplicacion se conecte como superusuario da igual, porque RLS no
-- se evalua. Pero el dia que se retire el privilegio, estas 33 tablas serian
-- las unicas del esquema donde activar RLS no cambiaria nada: cualquier ruta
-- que llegase sin contexto —un olvido, un job, un endpoint nuevo— seguiria
-- viendo el ERP de todos los inquilinos a la vez. Es peor que un hueco de
-- politica: un hueco deniega y se nota; esto concede y no se nota.
--
-- Retirar esa rama es lo que hace que activar RLS signifique algo aqui.
--
-- QUIEN LLEGA HOY SIN CONTEXTO, BUSCADO EN EL CODIGO
-- ---------------------------------------------------
-- Se barrieron los 33 nombres de tabla por `backend/` y `apps/web/src`. El SQL
-- contra ellas sale de exactamente dos ficheros:
--
--   * `backend/agency/erp/ErpDomainSnapshotStore.ts` — el unico dueno del
--     acceso. Todas sus ESCRITURAS (`saveSnapshot`, `withDomainMutation`,
--     `appendAuditEvent`) ya llamaban a `setTenantGuc()`, que hace
--     `set_config('app.tenant_id', ..., true)` dentro de la transaccion.
--   * `backend/agency/erp/ErpRelationalMirror.ts` — se ejecuta con el cliente y
--     dentro de la transaccion del anterior, asi que hereda el contexto.
--
-- Las rutas de `apps/web/src/app/api/saas/erp/*` no tocan estas tablas: solo
-- mencionan el nombre en textos de documentacion. `OsCatalogV1.ts`, igual.
--
-- Habia UNA excepcion, y era una lectura: `loadSnapshot()` consultaba fuera de
-- transaccion y sin fijar el GUC. Con la politica vieja no se notaba —sin
-- contexto abria todo y el `WHERE tenant_id = $1` de la propia consulta hacia
-- el trabajo—, pero con esta migracion habria pasado a devolver cero filas: el
-- ERP arrancando vacio para todo el mundo, sin un solo error. Se corrige en el
-- mismo cambio (`loadSnapshot` pasa a abrir transaccion y fijar el GUC, como
-- ya hacian las escrituras). Sin esa correccion, esta migracion seria una
-- averia.
--
-- No hace falta el rol `nelvyon_jobs` de la 540 en ninguna de las 33: no hay
-- proceso de fondo, cron, worker ni ETL que las escriba. `erp_idempotency_keys`
-- y el resto del esquema reservado por la 519 no los escribe nadie todavia.
--
-- POR QUE LA COMPARACION SE QUEDA IGUAL
-- -------------------------------------
-- Solo se quita la rama `IS NULL`. `tenant_id = nelvyon_erp_tenant_text()`
-- sigue tal cual, y sigue siendo el mismo `app.tenant_id` que fija la
-- aplicacion. Sin contexto la funcion devuelve NULL, la comparacion es NULL y
-- no pasa ninguna fila: fail-closed, como el resto del esquema.
--
-- IDEMPOTENTE
-- -----------
-- `DROP POLICY IF EXISTS` + `CREATE POLICY` sobre el mismo nombre que ya usaba
-- la 520, tabla por tabla y saltandose las que no existan. Reaplicarla N veces
-- deja el mismo estado. No modifica la 520: la sustituye en efecto, dejando
-- rastro de por que.

DO $erp_fail_closed$
DECLARE
    v_tabla text;
    -- Las mismas 33 de la 520. Se listan explicitamente en vez de descubrirlas
    -- por el patron `IS NULL OR`: una lista es auditable y no puede arrastrar
    -- por accidente una politica de otro sitio que use esa misma forma por un
    -- motivo legitimo.
    v_tablas text[] := ARRAY[
        'erp_assets',
        'erp_audit_events',
        'erp_boms',
        'erp_corrective_actions',
        'erp_domain_snapshots',
        'erp_field_work_orders',
        'erp_goods_receipts',
        'erp_idempotency_keys',
        'erp_incidents',
        'erp_inspections',
        'erp_inventory_products',
        'erp_locations',
        'erp_lots',
        'erp_maintenance_orders',
        'erp_manufacturing_orders',
        'erp_min_stock_rules',
        'erp_non_conformances',
        'erp_physical_counts',
        'erp_plm_documents',
        'erp_purchase_orders',
        'erp_purchase_requests',
        'erp_quality_plans',
        'erp_reservations',
        'erp_rfqs',
        'erp_routings',
        'erp_serials',
        'erp_stock_moves',
        'erp_supplier_returns',
        'erp_suppliers',
        'erp_timesheets',
        'erp_warehouses',
        'erp_work_centers',
        'saas_projects_erp'
    ];
    v_convertidas integer := 0;
BEGIN
    FOREACH v_tabla IN ARRAY v_tablas LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            RAISE NOTICE '542: la tabla % no existe; se omite', v_tabla;
            CONTINUE;
        END IF;

        -- Comprobacion de columna: si alguna de estas tablas perdiera
        -- `tenant_id`, crear la politica fallaria a medias y dejaria la tabla
        -- con RLS y sin politica, que es denegar todo en silencio. Mejor parar.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = v_tabla
               AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION '542: % no tiene columna tenant_id; no se puede acotar', v_tabla;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                       v_tabla || '_erp_tenant', v_tabla);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL '
            '  USING (tenant_id = public.nelvyon_erp_tenant_text()) '
            '  WITH CHECK (tenant_id = public.nelvyon_erp_tenant_text())',
            v_tabla || '_erp_tenant', v_tabla);
        v_convertidas := v_convertidas + 1;
    END LOOP;

    RAISE NOTICE '542: % politicas ERP convertidas a fail-closed', v_convertidas;
END;
$erp_fail_closed$;

-- ═══════════════════════════════════════════════════════════════════════════
-- LA MISMA AVERIA CON OTRA FORMA: `cdp_identities`
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Buscando el patron `IS NULL OR` por el esquema entero aparecio una politica
-- que concede igual pero escrita de otra manera, creada por la 507:
--
--     CREATE POLICY cdp_identities_tenant ON cdp_identities
--         FOR ALL USING (workspace_id = current_tenant_id()) ...
--     CREATE POLICY cdp_identities_public ON cdp_identities
--         FOR ALL USING (true);
--
-- Las politicas permisivas se COMBINAN CON OR. La segunda no anade un caso: se
-- come entera a la primera, para SELECT, UPDATE y DELETE. `cdp_identities`
-- guarda identidades del Customer Data Platform —`user_id`, `anonymous_id` y un
-- `traits` jsonb con lo que se sepa de cada persona—, o sea datos personales de
-- todos los inquilinos, legibles y borrables por cualquiera.
--
-- Es peor que las 33 de arriba: aquellas al menos aislaban CUANDO habia
-- contexto. Esta abre siempre.
--
-- No hay nada que preservar. Se reviso `backend/services/cdp_service.py`, el
-- unico que la usa: todas sus consultas acotan por `workspace_id = :ws`, salvo
-- un UPDATE que apunta por `id` y que precisamente confiaba en RLS para no
-- salirse del inquilino — confianza que esta politica dejaba sin efecto. La
-- ingesta anonima de eventos, que si necesita entrar sin identidad, va contra
-- `cdp_events` y tiene su propia politica de INSERT; `cdp_identities` no la
-- necesita, porque su INSERT ya lo cubre el WITH CHECK de `cdp_identities_tenant`.
--
-- Se retira. Queda `cdp_identities_tenant`, que acota por el mismo eje que el
-- resto del esquema y que el propio servicio.
DO $cdp_identities$
BEGIN
    IF to_regclass('public.cdp_identities') IS NULL THEN
        RAISE NOTICE '542: cdp_identities no existe; se omite';
        RETURN;
    END IF;

    -- Antes de quitar la abierta, asegurarse de que queda la que acota. Si no
    -- estuviera, retirarla dejaria la tabla con RLS y sin politica: se pasaria
    -- de conceder todo a denegar todo, que es cambiar una averia por otra.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'cdp_identities'
           AND policyname = 'cdp_identities_tenant'
    ) THEN
        RAISE EXCEPTION
            '542: cdp_identities no tiene la politica por inquilino; retirar la '
            'abierta la dejaria sin ninguna y denegaria todo en silencio.';
    END IF;

    DROP POLICY IF EXISTS cdp_identities_public ON public.cdp_identities;
    RAISE NOTICE '542: retirada cdp_identities_public (FOR ALL USING (true))';
END;
$cdp_identities$;
