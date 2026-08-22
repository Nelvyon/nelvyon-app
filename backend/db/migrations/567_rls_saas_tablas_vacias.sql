-- RLS para las tablas del espacio SaaS que estan VACIAS en produccion.
--
-- EL ESPACIO SaaS, MEDIDO
-- -----------------------
-- 220 tablas tienen `tenant_id` —no 147, que era la cifra que se venia
-- arrastrando—. De ellas 62 ya tienen RLS y 158 no. De esas 158:
--
--     uuid   vacias      127   <- este lote
--     uuid   con datos    16   necesitan saber quien las lee antes de tocarlas
--     text   vacias        3   otro tipo: la politica no compila
--     text   con datos     1   idem
--     varchar vacias       9   idem
--     integer vacias       2   idem
--
-- Sobre una tabla vacia, activar RLS no puede ocultarle datos a nadie porque no
-- hay datos que ocultar. Lo que si puede es romper una ESCRITURA, y por eso este
-- lote se certifica ejecutando las baterias, no leyendo el catalogo.
--
-- QUE POLITICA, Y UNA CORRECCION
-- -------------------------------
-- La primera version de esta migracion iba a usar `nelvyon_apply_rls_tenant_id`,
-- que encontre buscando funciones por nombre. Al medir las politicas REALES del
-- espacio SaaS resulto ser el patron MINORITARIO: lo usa UNA tabla.
--
-- Conviven tres:
--     `_os_select` / `_os_mutate`   sobre `workspace_id` — son tablas del espacio
--                                   OS que ademas tienen `tenant_id`
--     `_saas_tenant*`               `tenant_id = nelvyon_current_saas_tenant_uuid()`
--                                   <- EL DOMINANTE
--     `_select_own`                 `nelvyon_current_tenant_id()` — 1 tabla
--
-- Se usa el dominante. `nelvyon_current_saas_tenant_uuid()` resuelve el inquilino
-- SaaS a partir del contexto de workspace, que es el puente que ya existe entre
-- los dos espacios de identidad.
--
-- Sin esta medicion habria certificado fielmente la ejecucion de una lista con el
-- patron equivocado — que es exactamente lo que paso con `helpdesk_tickets` en la
-- 564. Las politicas se crean EN LINEA: esta migracion no anade funciones.
--
-- DE QUE DEPENDE SU SEGURIDAD, DICHO CLARO
-- ----------------------------------------
-- `nelvyon_current_tenant_id()` lee una variable de sesion que fija el
-- middleware. Es decir: esta politica protege contra una consulta que se olvide
-- de filtrar, NO contra un actor que pueda fijar esa variable a voluntad. Es la
-- misma garantia que tienen hoy las 62 tablas ya protegidas, y por eso este lote
-- las iguala en vez de quedarse por debajo. Reforzar el modelo entero es trabajo
-- aparte y esta anotado como tal.
--
-- CUATRO GUARDAS, TODAS FAIL-CLOSED
-- ---------------------------------
--   existe        una tabla ausente en este despliegue se omite
--   esta vacia    si tiene filas pertenece a otro lote
--   es UUID       si `tenant_id` no es uuid la politica no compila y abortaria
--                 el lote entero; se omite esa tabla y se sigue
--   SIN RLS YA    <- la cuarta, y la aprendida a golpes
--
-- LA CUARTA GUARDA: POR QUE NO SE TOCA UNA TABLA QUE YA TIENE RLS
-- ----------------------------------------------------------------
-- `api_keys` e `invoices` tienen `workspace_id` INTEGER **y** `tenant_id` UUID, y
-- la 566 ya les dio la familia `_os_*`. Anadirles encima la familia
-- `_saas_tenant*` no las protege mas: en PostgreSQL varias politicas PERMISSIVE
-- para el mismo comando se combinan con **OR**, asi que una fila seria alcanzable
-- por CUALQUIERA de los dos caminos. Es decir, ensancharia el acceso.
--
-- Se descubrio aplicando la migracion en certificacion y mirando el catalogo
-- despues: las dos tablas quedaron con ocho politicas, cuatro de cada familia.
-- No lo habria visto revisando el SQL.
--
-- Una tabla que vive en los dos espacios de identidad necesita una decision
-- explicita sobre cual manda, no dos politicas sumandose. Quedan fuera de este
-- lote y anotadas como trabajo propio.
--
-- ADITIVA. No toca ni una fila.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_saas_tenant_select ON public.<t>;
--   (y _insert / _update / _delete)

DO $bloque_567$
DECLARE
    t text;
    tiene_filas boolean;
    tipo text;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public'
                      AND p.proname = 'nelvyon_current_saas_tenant_uuid') THEN
        RAISE NOTICE '567: falta nelvyon_current_saas_tenant_uuid; no se aplica nada';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'ab_tests', 'api_key_usage_log', 'api_keys', 'calendar_events',
        'certificate_templates', 'certificates', 'communities', 'community_posts',
        'countdown_timers', 'custom_object_records', 'custom_objects', 'documents',
        'dragdrop_workflows', 'gbp_reviews', 'invoices', 'knowledge_base_articles',
        'lead_scoring_rules', 'local_ai_audit', 'local_ai_ingest_jobs',
        'os_qa_review_queue', 'os_service_contracts', 'pipelines', 'products',
        'saas_ads_campaign_links', 'saas_ads_connections', 'saas_ads_metrics_cache',
        'saas_ads_optimizer_rules', 'saas_affiliate_commissions',
        'saas_affiliate_links', 'saas_agent_runs', 'saas_approval_channel_settings',
        'saas_benchmark_snapshots', 'saas_ceo_brief_settings', 'saas_compliance_vault',
        'saas_contracts', 'saas_conversation_messages', 'saas_conversations',
        'saas_crm_sync_state', 'saas_crm_territories', 'saas_custom_roles',
        'saas_data_playbook_steps', 'saas_data_playbooks', 'saas_deliverable_links',
        'saas_deliverable_revenue', 'saas_dunning_events', 'saas_form_submissions',
        'saas_forms', 'saas_funnel_steps', 'saas_funnels', 'saas_geo_visibility_runs',
        'saas_helpdesk_macros', 'saas_helpdesk_messages', 'saas_helpdesk_tickets',
        'saas_hubspot_sync_state', 'saas_inbox_agent_settings',
        'saas_inbox_agent_suggestions', 'saas_inbox_routing', 'saas_inbox_sla_policies',
        'saas_integration_connections', 'saas_kb_articles', 'saas_kb_categories',
        'saas_lead_attribution', 'saas_lead_scores', 'saas_lead_scoring_rules',
        'saas_lms_certificates', 'saas_lms_courses', 'saas_lms_enrollments',
        'saas_lms_lessons', 'saas_lms_modules', 'saas_lms_progress',
        'saas_loyalty_balances', 'saas_loyalty_transactions', 'saas_mcp_tool_audit',
        'saas_member_custom_roles', 'saas_membership_access', 'saas_membership_members',
        'saas_membership_plans', 'saas_pack_launches', 'saas_pipeline_deals',
        'saas_playbook_actions', 'saas_playbooks', 'saas_private_ai_agent_overrides',
        'saas_private_ai_approvals', 'saas_prospecting_lists',
        'saas_prospecting_prospects', 'saas_prospecting_searches', 'saas_pwa_installs',
        'saas_pwa_push_queue', 'saas_pwa_push_subscriptions', 'saas_quote_items',
        'saas_quote_sequences', 'saas_quotes', 'saas_recurring_deliverables',
        'saas_seo_tracked_keywords', 'saas_sequence_enrollments', 'saas_sms_log',
        'saas_social_accounts', 'saas_social_posts', 'saas_social_proof_drafts',
        'saas_sso_configs', 'saas_sso_identities', 'saas_stage_probabilities',
        'saas_stripe_meter_items', 'saas_subcuentas', 'saas_tenant_installed_apps',
        'saas_tenant_ip_allowlist', 'saas_tenant_memory_chunks',
        'saas_twilio_a2p_registrations', 'saas_usage_meter_daily', 'saas_user_mfa',
        'saas_utm_clicks', 'saas_utm_links', 'saas_voice_commands',
        'saas_wa_catalog_products', 'saas_wa_settings', 'saas_wa_templates',
        'saas_web_pages', 'saas_webhook_failures', 'saas_workflow_recipes',
        'snippets', 'store_order_items', 'store_orders', 'store_settings',
        'surveys', 'team_members', 'webhooks', 'white_label_configs'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '567: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id';

        IF tipo IS DISTINCT FROM 'uuid' THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '567: %.tenant_id es % y no uuid; se omite', t, tipo;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '567: % tiene filas; pertenece a otro lote, se omite', t;
            CONTINUE;
        END IF;

        -- Cuarta guarda: si ya la protege OTRA familia de politicas, no se toca.
        --
        -- Sumar una segunda familia PERMISSIVE ENSANCHA el acceso en vez de
        -- restringirlo: PostgreSQL las combina con OR, asi que la fila quedaria
        -- alcanzable por cualquiera de los dos caminos.
        --
        -- Se mira si hay politicas AJENAS a esta migracion, no si hay RLS a
        -- secas: preguntar solo por `relrowsecurity` hacia que la migracion se
        -- omitiera a si misma al reaplicarse, y entonces no se podia comprobar
        -- desde un estado limpio que hace lo que dice.
        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t
                      AND p.policyname NOT LIKE t || '\_saas\_tenant\_%') THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '567: % ya la protege otra familia de politicas; anadir '
                         'la nuestra la ensancharia (PERMISSIVE se combinan con OR)', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_saas_tenant_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_saas_tenant_insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_saas_tenant_update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_saas_tenant_delete', t);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING '
            '(tenant_id = public.nelvyon_current_saas_tenant_uuid())',
            t || '_saas_tenant_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK '
            '(tenant_id = public.nelvyon_current_saas_tenant_uuid())',
            t || '_saas_tenant_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING '
            '(tenant_id = public.nelvyon_current_saas_tenant_uuid()) WITH CHECK '
            '(tenant_id = public.nelvyon_current_saas_tenant_uuid())',
            t || '_saas_tenant_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE USING '
            '(tenant_id = public.nelvyon_current_saas_tenant_uuid())',
            t || '_saas_tenant_delete', t);

        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '567: RLS aplicado a % tablas SaaS, % omitidas', aplicadas, omitidas;
END
$bloque_567$;
