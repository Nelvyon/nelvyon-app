-- RLS para las tablas SaaS que SI tienen datos en produccion.
--
-- EL MISMO CRITERIO QUE LA 569, CON UNA GUARDA MAS
-- -------------------------------------------------
-- La 569 protegio tablas OS con datos y aprendio que sobre datos existentes RLS
-- puede hacer algo peor que fallar: volverlos INVISIBLES sin dar error. Alli las
-- guardas nuevas fueron «ninguna fila con identificador NULL» y «el duenno tiene
-- quien lo vea».
--
-- Aqui aparece una tercera, y no es teorica.
--
-- SEPTIMA GUARDA: NINGUNA FILA APUNTA A UN INQUILINO QUE NO EXISTE
-- -----------------------------------------------------------------
-- La politica compara `tenant_id` con el inquilino que resuelve
-- `nelvyon_current_saas_tenant_uuid()`, que sale de `saas_tenants`. Una fila
-- cuyo `tenant_id` no esta en `saas_tenants` no la satisface NUNCA: queda oculta
-- de forma permanente y sin error.
--
-- Medido en produccion:
--     saas_pack_entitlements   32 inquilinos distintos, 10 HUERFANOS
--     saas_autopilot_settings   6 inquilinos distintos,  5 HUERFANOS
--
-- Las dos quedan fuera. Y ademas eso es un hallazgo por si mismo: hay
-- entitlements y ajustes de autopilot apuntando a inquilinos que ya no existen.
-- Protegerlos los esconderia en vez de arreglarlos.
--
-- QUE NO ENTRA, Y POR QUE
-- -----------------------
-- Las cinco tablas de doble espacio —`os_agent_audit_events`, `os_qa_audit_runs`,
-- `os_sector_shield_audits`, `os_truth_guard_audits`, `os_delivery_certificates`—
-- tienen `tenant_id` al 100% NULL: su identificador real es `workspace_id` y las
-- protege la familia `_os_*` de la 569. Anadirles una politica SaaS haria dos
-- cosas malas a la vez: sumar una segunda familia PERMISSIVE —que ENSANCHA por
-- OR— y comparar contra una columna vacia.
--
-- LAS GUARDAS
-- -----------
--   existe / tenant_id es uuid / sin otra familia de politicas /
--   sin filas con tenant_id NULL / sin inquilinos huerfanos
--
-- Cualquiera omite ESA tabla y sigue. Nunca aborta el lote.
--
-- ADITIVA. No toca ni una fila. Solo cambia quien puede verlas.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_saas_tenant_select ON public.<t>;  (y los otros)

DO $bloque_572$
DECLARE
    t text;
    tipo text;
    nulos bigint;
    huerfanos bigint;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public'
                      AND p.proname = 'nelvyon_current_saas_tenant_uuid') THEN
        RAISE NOTICE '572: falta nelvyon_current_saas_tenant_uuid; no se aplica nada';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'saas_ceo_brief_runs', 'saas_private_ai_settings', 'saas_private_ai_audit',
        'saas_tenant_memory_settings', 'saas_workflow_versions',
        'saas_affiliate_programs', 'saas_deliverability_snapshots',
        'saas_loyalty_programs', 'saas_sequences',
        -- Se incluyen a proposito para que las guardas las NOMBREN al omitirlas.
        -- Que aparezcan en el resumen es mejor que desaparecer del inventario.
        'saas_pack_entitlements', 'saas_autopilot_settings'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '572: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id';

        IF tipo IS DISTINCT FROM 'uuid' THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '572: %.tenant_id es % y no uuid; se omite', t, tipo;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t
                      AND p.policyname NOT LIKE t || '\_saas\_tenant\_%') THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '572: % ya la protege otra familia; anadir la nuestra la '
                         'ensancharia (PERMISSIVE se combinan con OR)', t;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t)
           INTO nulos;
        IF nulos > 0 THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '572: % tiene % filas con tenant_id NULL; la politica no '
                         'las satisface nunca y quedarian ocultas. Se omite',
                         t, nulos;
            CONTINUE;
        END IF;

        -- Septima guarda: filas que apuntan a un inquilino inexistente.
        EXECUTE format(
            'SELECT count(DISTINCT x.tenant_id) FROM public.%I x '
            ' WHERE NOT EXISTS (SELECT 1 FROM public.saas_tenants st '
            '                    WHERE st.id = x.tenant_id)', t)
           INTO huerfanos;
        IF huerfanos > 0 THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '572: % tiene filas de % inquilino(s) que NO existen en '
                         'saas_tenants; protegerla las esconderia para siempre. '
                         'Se omite hasta que se arregle el dato', t, huerfanos;
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

    RAISE NOTICE '572: RLS aplicado a % tablas SaaS con datos, % omitidas',
                 aplicadas, omitidas;
END
$bloque_572$;
