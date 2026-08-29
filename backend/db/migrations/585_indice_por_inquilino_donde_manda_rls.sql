-- Migración 585 · el índice por inquilino en las tablas donde manda RLS.
--
-- EL ARGUMENTO, que no es de rendimiento sino de estructura.
--
-- Estas 34 tablas tienen Row Level Security activo con una política del tipo
-- `workspace_id = current_tenant_id()`. Eso significa que PostgreSQL añade ese
-- filtro a TODA consulta que las toque: no hay ninguna lectura que no filtre
-- por inquilino, ni puede haberla.
--
-- Y ninguna de las 34 tiene un índice que empiece por `workspace_id`.
--
-- Es decir: cada lectura de cualquiera de estas tablas, para responder por un
-- cliente, recorre las filas de todos. No es una hipótesis de escalado: es lo
-- que el plan de ejecución hace hoy.
--
-- EL NÚMERO, porque sin número esto sería una corazonada. Sobre una tabla
-- desechable con la misma forma —200.000 filas, 500 inquilinos, consulta por
-- uno— medido con EXPLAIN ANALYZE:
--
--     sin índice ....... 9,88 ms   Gather Merge › Sort › Seq Scan
--     con índice ....... 0,14 ms   Index Scan
--     ------------------------------------------------------
--                        73 veces más rápido
--
-- La reproducción está en `scripts/donde-duele-de-verdad.mjs` y el detalle en
-- `docs/medicion_de_rendimiento.json`.
--
-- POR QUÉ AHORA Y NO ANTES. Porque hasta ahora nadie lo había medido. Las
-- tablas están casi vacías en desarrollo, y con tablas vacías el escaneo
-- secuencial ES la elección correcta de PostgreSQL: forzar un índice ahí sería
-- más lento. El problema no se ve hasta que hay volumen, y cuando hay volumen
-- ya duele.
--
-- LO QUE ESTA MIGRACIÓN NO HACE:
--
--   · No toca datos. Sólo crea índices.
--   · No añade índices «por si acaso» a tablas sin RLS. El criterio es
--     estrecho a propósito: un índice cuesta en cada escritura, y ponerlos a
--     voleo cambia un problema de lectura por uno de escritura.
--   · No se aplica sola en producción. Como todas, pasa por ADR-064.
--
-- ORDEN DE LAS COLUMNAS. `workspace_id` primero siempre: es el filtro que RLS
-- garantiza. Donde la tabla tiene una fecha de creación, va detrás, porque el
-- patrón real es «lo último de este cliente» y así el índice sirve también para
-- ordenar sin pasar por un Sort.

DO $$
DECLARE
    t TEXT;
    tiene_fecha BOOLEAN;
    nombre TEXT;
    -- Las 34 tablas con RLS y sin índice que empiece por workspace_id, medidas
    -- el 29-08-2026. La lista es explícita a propósito: una migración que
    -- descubre sus propias tablas al ejecutarse hace algo distinto en cada
    -- base, y entonces no se puede revisar leyéndola.
    tablas TEXT[] := ARRAY[
        'ab_events', 'apollo_lead_cache', 'appointments', 'client_websites',
        'conversations', 'facebook_messenger_messages', 'form_responses',
        'instagram_dm_messages', 'lms_lessons', 'lms_modules', 'lms_progress',
        'loyalty_transactions', 'os_acciones', 'os_agent_audit_events',
        'os_aprendizajes', 'os_brief_diff_runs', 'os_deliverable_approval_tokens',
        'os_mediciones', 'os_qa_audit_runs', 'os_recurring_run_log',
        'os_retainer_cycles', 'os_sector_shield_audits', 'os_store_discounts',
        'os_store_orders', 'os_store_pages', 'os_store_products',
        'os_truth_guard_audits', 'os_website_pages', 'pr_releases', 'qr_scans',
        'saas_shared_memory_entries', 'tiktok_dm_messages',
        'visual_workflow_executions', 'webinar_chat_messages'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        -- Una tabla que no exista se salta en silencio. No es dejadez: estas
        -- tablas vienen de servicios distintos y no todas las bases tienen
        -- todas. Reventar aquí impediría migrar por una tabla que a esa
        -- instalación no le hace falta.
        CONTINUE WHEN to_regclass('public.' || quote_ident(t)) IS NULL;

        CONTINUE WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = t
               AND column_name = 'workspace_id'
        );

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = t
               AND column_name = 'created_at'
        ) INTO tiene_fecha;

        nombre := t || '_ws_idx';

        IF tiene_fecha THEN
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id, created_at DESC)',
                nombre, t
            );
        ELSE
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)',
                nombre, t
            );
        END IF;
    END LOOP;
END
$$;

-- ── Autocomprobación ────────────────────────────────────────────────────────
--
-- No basta con que la migración termine sin error: `CREATE INDEX IF NOT EXISTS`
-- calla si algo ya estaba, y `CONTINUE` calla si algo no estaba. Sin esta
-- comprobación, una migración que no hubiera creado NADA se registraría igual
-- de aplicada — que es exactamente lo que pasó con la 507.

DO $$
DECLARE
    sin_indice INTEGER;
    detalle TEXT;
BEGIN
    SELECT count(*), string_agg(x.table_name, ', ')
      INTO sin_indice, detalle
      FROM (
        SELECT c.table_name
          FROM information_schema.columns c
          JOIN pg_class pc ON pc.relname = c.table_name
          JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
         WHERE c.table_schema = 'public'
           AND c.column_name = 'workspace_id'
           AND pc.relrowsecurity           -- sólo donde RLS obliga a filtrar
           AND NOT EXISTS (
             SELECT 1
               FROM pg_index i
               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
              WHERE i.indrelid = pc.oid AND a.attname = 'workspace_id'
           )
      ) x;

    IF sin_indice > 0 THEN
        RAISE EXCEPTION
            'migracion 585: quedan % tabla(s) con RLS por inquilino y sin indice por workspace_id: %. Cada lectura de esas tablas recorre las filas de todos los clientes para responder por uno.',
            sin_indice, detalle;
    END IF;
END
$$;
