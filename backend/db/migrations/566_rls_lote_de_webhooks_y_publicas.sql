-- RLS para las 23 tablas que quedaban del espacio OS.
--
-- POR QUE AHORA Y NO EN LA 563
-- ----------------------------
-- La 563 las excluyo con un motivo concreto: las escribian caminos publicos —
-- webhooks y pixeles de seguimiento— que no tienen usuario, asi que
-- `nelvyon_user_in_workspace()` devuelve false y la politica los denegaria.
--
-- Ese motivo ya no aplica a las que van aqui: el bloque de webhooks convirtio
-- esos caminos al patron declarado —rol `nelvyon_jobs`, que bypassa RLS, con el
-- `workspace_id` resuelto desde un identificador de procedencia verificada— y la
-- 564 les dio los privilegios. Lo que antes rompia RLS ahora ni la toca.
--
-- COMO SE ELIGIERON
-- -----------------
-- Las 74 tablas del espacio OS vacias en produccion menos las 51 de la 563. No
-- por analisis estatico: el clasificador por rutas que escribi para esto dio
-- falsos positivos demostrables —atribuyo `text2pay_payments` al webhook de
-- Instagram— asi que no se uso como evidencia. Cada tabla se valida ejecutando
-- la suite completa con RLS ya activo: lo que rompa, rompe en una ruta real.
--
-- TRES GUARDAS, TODAS FAIL-CLOSED
-- -------------------------------
--   existe        una tabla ausente en este despliegue se omite
--   esta vacia    si tiene filas pertenece a otro lote: activar RLS sobre datos
--                 existentes puede ocultarselos a quien los necesita
--   es INTEGER    si `workspace_id` no es entero la politica no compilaria
--
-- Cualquiera de las tres omite ESA tabla y sigue. Nunca aborta el lote.
--
-- ADITIVA. No toca ni una fila.
--
-- ROLLBACK
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS <t>_os_select ON public.<t>;   (y _mutate)

DO $bloque_566$
DECLARE
    t text;
    tiene_filas boolean;
    tipo text;
    aplicadas int := 0;
    omitidas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        -- mensajeria entrante: ahora escrita por `nelvyon_jobs`
        'instagram_dm_conversations', 'instagram_dm_messages',
        'facebook_messenger_conversations', 'facebook_messenger_messages',
        'tiktok_dm_conversations', 'tiktok_dm_messages',
        -- soporte entrante: idem
        'tickets',
        -- pagos, presupuestos y agenda: idem
        'text2pay_payments', 'bookings',
        -- caminos autenticados que nunca fueron el problema
        'api_keys', 'automation_jobs', 'automation_webhooks',
        'client_websites', 'crm_activities', 'crm_contacts', 'crm_deals',
        'invoice_sequences', 'invoices', 'webhook_deliveries',
        'webhook_endpoints', 'workflows',
        -- seguimiento publico: se convierten en el mismo bloque
        'campaigns', 'public_analytics_events'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '566: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t
           AND column_name = 'workspace_id';

        IF tipo IS DISTINCT FROM 'integer' THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '566: %.workspace_id es % y no integer; se omite', t, tipo;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '566: % tiene filas; pertenece a otro lote, se omite', t;
            CONTINUE;
        END IF;

        PERFORM public.nelvyon_apply_os_workspace_rls(t);
        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '566: RLS aplicado a % tablas, % omitidas', aplicadas, omitidas;
END
$bloque_566$;
