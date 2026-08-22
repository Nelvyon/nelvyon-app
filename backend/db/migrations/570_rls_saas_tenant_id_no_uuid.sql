-- RLS para las tablas SaaS cuyo `tenant_id` NO es uuid.
--
-- EL PROBLEMA
-- -----------
-- 14 tablas guardan el inquilino en `tenant_id` con un tipo distinto de uuid:
--
--     character varying   9    os_assets, os_health_reports, saas_chat_messages,
--                              saas_client_profiles, saas_gdpr_requests,
--                              saas_invoices, saas_notifications, saas_partners,
--                              saas_whitelabel_configs
--     text                4    os_agent_data_cache, saas_appointments,
--                              saas_reports, saas_activation_checklist
--     integer             2    chat_widget_config, data_processing_agreements
--
-- La politica estandar del espacio SaaS compara con
-- `nelvyon_current_saas_tenant_uuid()`, que devuelve UUID. Contra una columna de
-- texto PostgreSQL no puede comparar sin un cast, y contra una de entero no puede
-- comparar en absoluto: la migracion abortaria.
--
-- Por eso quedaron fuera de la 567 y por eso necesitan politica propia.
--
-- DOS FAMILIAS, SEGUN LO QUE GUARDA LA COLUMNA DE VERDAD
-- ------------------------------------------------------
--   texto     el inquilino es el mismo uuid, escrito como cadena. Se compara
--             `tenant_id = nelvyon_current_saas_tenant_uuid()::text`. El cast va
--             en el lado de la FUNCION, no en el de la columna: castear la
--             columna impediria usar cualquier indice sobre ella.
--
--   entero    eso NO es un inquilino SaaS: es un `workspace_id` con el nombre
--             equivocado. `saas_tenants.id` es uuid, asi que un entero no puede
--             referirse a el. Se compara contra `current_tenant_id()`, que es el
--             workspace de la sesion, y se acota por pertenencia igual que
--             cualquier tabla del espacio OS.
--
-- Es una correccion de nombre, no de modelo: renombrar la columna seria mas
-- honesto pero rompe todo el codigo que la lee, asi que se documenta aqui y se
-- protege por lo que ES.
--
-- LAS GUARDAS
-- -----------
--   existe / esta vacia / sin otra familia de politicas / el tipo es uno de los
--   tres esperados. Cualquiera omite ESA tabla y sigue.
--
-- `saas_activation_checklist` tiene UNA fila. Entra igual: la guarda de vacia la
-- omitira y la nombrara, para que se vea que existe en vez de perderla.
--
-- ADITIVA. No toca ni una fila.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_saas_tenant_select ON public.<t>;  (y los otros)

DO $bloque_570$
DECLARE
    t text;
    tipo text;
    tiene_filas boolean;
    expr text;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'os_assets', 'os_health_reports', 'saas_chat_messages',
        'saas_client_profiles', 'saas_gdpr_requests', 'saas_invoices',
        'saas_notifications', 'saas_partners', 'saas_whitelabel_configs',
        'os_agent_data_cache', 'saas_appointments', 'saas_reports',
        'saas_activation_checklist',
        'chat_widget_config', 'data_processing_agreements'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '570: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id';

        IF tipo IN ('text', 'character varying') THEN
            expr := 'tenant_id = public.nelvyon_current_saas_tenant_uuid()::text';
        ELSIF tipo = 'integer' THEN
            expr := 'public.nelvyon_os_workspace_select(tenant_id)';
        ELSE
            omitidas := omitidas + 1;
            RAISE NOTICE '570: %.tenant_id es % y no se sabe con que comparar; '
                         'se omite', t, tipo;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '570: % tiene filas; activar RLS sobre datos existentes '
                         'pide comprobar antes quien los lee. Se omite', t;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t) THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '570: % ya tiene politicas; anadir otra familia la '
                         'ensancharia (PERMISSIVE se combinan con OR)', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',
                       t || '_saas_tenant_select', t, expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
                       t || '_saas_tenant_insert', t, expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) '
                       'WITH CHECK (%s)', t || '_saas_tenant_update', t, expr, expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
                       t || '_saas_tenant_delete', t, expr);

        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '570: RLS aplicado a % tablas de tipo no-uuid, % omitidas',
                 aplicadas, omitidas;
END
$bloque_570$;
