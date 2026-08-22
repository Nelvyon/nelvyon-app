-- RLS para las 52 tablas OS que siguen vacias en produccion.
--
-- POR QUE UNA MIGRACION NUEVA Y NO LA 563
-- ----------------------------------------
-- La 563 cubria 51 de estas y quedo certificada pero sin autorizar. Resucitarla
-- tal cual seria aplicar una lista medida hace horas contra un esquema que desde
-- entonces ha recibido las migraciones 564, 565, 566 y 567. Se vuelve a medir y
-- se declara la lista de ahora: 52 tablas, las 51 de aquella mas `client_memory`.
--
-- `client_memory` entra en la lista y la guarda de tipo la va a OMITIR: su
-- `workspace_id` es UUID, no INTEGER, asi que la politica no compilaria. Se
-- incluye a proposito para que el resumen la nombre en vez de que desaparezca en
-- silencio de un inventario a otro. Su aislamiento se resuelve con el problema de
-- los dos espacios de identidad, que es trabajo aparte.
--
-- LAS CUATRO GUARDAS, TODAS FAIL-CLOSED
-- -------------------------------------
--   existe        una tabla ausente en este despliegue se omite
--   esta vacia    si tiene filas pertenece a otro lote: activar RLS sobre datos
--                 existentes puede ocultarselos a quien hoy los ve
--   es INTEGER    si `workspace_id` no es entero la politica no compila
--   sin otra familia   <- aprendida en la 567: dos familias PERMISSIVE sobre la
--                 misma tabla se combinan con OR y ENSANCHAN el acceso en vez de
--                 restringirlo
--
-- Cualquiera omite ESA tabla y sigue. Nunca aborta el lote.
--
-- ADITIVA. No toca ni una fila.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_os_select ON public.<t>;   (y _mutate)

DO $bloque_568$
DECLARE
    t text;
    tiene_filas boolean;
    tipo text;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'affiliates', 'agency_profiles', 'blog_posts',
        'client_memory', 'connector_configs', 'consent_records',
        'cpq_quotes', 'data_deletion_requests', 'dialer_advanced_sessions',
        'email_warmup_accounts', 'email_warmup_logs', 'executive_reports',
        'form_items', 'funnel_items', 'helpdesk_tickets',
        'intent_events', 'intent_scores', 'linkedin_inbox',
        'linkedin_outreach', 'messages', 'nelvyon_agents',
        'nelvyon_assets', 'nelvyon_bot_templates', 'nelvyon_outputs',
        'nelvyon_products', 'nelvyon_projects', 'nelvyon_quality_metrics',
        'nelvyon_user_settings', 'omnichannel_conversations', 'onboarding_workspace_steps',
        'os_cashflow', 'os_deals', 'os_expenses',
        'partner_records', 'pr_releases', 'presentation_history',
        'push_subscriptions', 'report_items', 'report_schedules',
        'sales_records', 'segment_results', 'snapchat_ads_campaigns',
        'social_auto_posts', 'social_auto_settings', 'template_outcomes',
        'templates', 'tiktok_ads_campaigns', 'web_performance_metrics',
        'website_items', 'whitelabel_configs', 'workspace_models',
        'workspace_usage'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '568: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t
           AND column_name = 'workspace_id';

        IF tipo IS DISTINCT FROM 'integer' THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '568: %.workspace_id es % y no integer; se omite', t, tipo;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '568: % tiene filas; pertenece a otro lote, se omite', t;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t
                      AND p.policyname NOT LIKE t || '\_os\_%') THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '568: % ya la protege otra familia de politicas; anadir '
                         'la nuestra la ensancharia (PERMISSIVE se combinan con OR)', t;
            CONTINUE;
        END IF;

        PERFORM public.nelvyon_apply_os_workspace_rls(t);
        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '568: RLS aplicado a % tablas, % omitidas', aplicadas, omitidas;
END
$bloque_568$;
