-- 591 — RLS para las 47 tablas cuyo dueño es `user_id` y se quedaron fuera.
--
-- QUE SE ENCONTRO
-- ---------------
-- 47 tablas de `public` tienen columna `user_id` —es decir, cada fila es de un
-- cliente concreto—, NO tienen row level security, y tienen `SELECT` concedido a
-- roles de aplicacion. Sin politica, cualquier lectura por esos roles devuelve
-- las filas de TODOS los clientes.
--
-- Lo que guardan no es accesorio:
--
--     integration_google_ads      access_token, refresh_token
--     integration_meta_ads        (idem, OAuth de terceros)
--     integration_shopify         access_token
--     integration_twilio          account_sid, auth_token
--     saas_api_keys               key_hash
--     digital_contracts           sign_token, signature_data, client_email
--     audit_log                   ip_address, user_agent, session_id
--
-- Credenciales OAuth de terceros, credenciales de Twilio —que envian SMS y
-- cuestan dinero—, tokens de firma de contratos, y direcciones IP.
--
-- La mayoria tenia ademas `SELECT` concedido a `anon`, el rol anonimo de
-- PostgREST, cuya clave (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) es publica por diseño
-- y viaja al navegador.
--
-- POR QUE SE ESCAPARON
-- --------------------
-- La 567 aplica RLS en masa, pero exige `tenant_id` de tipo uuid:
--
--     IF tipo IS DISTINCT FROM 'uuid' THEN … CONTINUE
--
-- Estas 47 no tienen `tenant_id`: tienen `user_id`. El barrido las salto una a
-- una, escribiendo un NOTICE que nadie leyo.
--
-- Y no habia nada que preguntara despues. Las cuatro comprobaciones de RLS del
-- arbol empiezan por `WHERE pc.relrowsecurity`: solo auditan el conjunto YA
-- protegido, asi que un agujero les resulta invisible por construccion. Esa
-- pregunta inversa la hace ahora `ningunaTablaConDuenoSeQuedaSinRls.pg.test.ts`.
--
-- LA POLITICA NO SE INVENTA
-- -------------------------
-- Es exactamente la que el producto ya usa en 202 tablas para esta misma
-- familia, copiada del catalogo:
--
--     ((user_id)::text = (nelvyon_jwt_user_id())::text)
--
-- El doble cast a texto no es adorno: 45 de las 47 tienen `user_id uuid` y dos
-- lo tienen `character varying`. Con el cast, la misma politica sirve para las
-- 47, que es justo por lo que el producto la escribio asi.
--
-- POR QUE ESTO NO ROMPE NADA HOY
-- ------------------------------
-- La aplicacion se conecta hoy como superusuario, que salta RLS. Para el
-- servicio en marcha esta migracion es un no-op: no cambia ni una respuesta.
--
-- Lo que cambia es el dia del cutover al rol `nelvyon_web_app` —sin SUPERUSER y
-- sin BYPASSRLS—, que es el objetivo de todo el trabajo de RLS. Sin esta
-- migracion, ese cutover habria convertido 47 tablas en lectura global.
--
-- NO SE REVOCA NINGUN GRANT, y es deliberado. Con RLS+FORCE y esta politica,
-- `anon` no tiene `request.jwt.claim.sub`, la comparacion es NULL y no ve NI UNA
-- fila: el agujero queda cerrado sin tocar privilegios. Revocar ademas el
-- `SELECT` de `anon` es defensa en profundidad razonable, pero es un cambio de
-- superficie mayor y se deja como decision aparte.
--
-- IDEMPOTENTE. Se puede aplicar dos veces. `DROP POLICY IF EXISTS` antes de
-- crear, y `ENABLE ROW LEVEL SECURITY` sobre una tabla que ya lo tiene es un
-- no-op.

DO $bloque_591$
DECLARE
    t text;
    tipo text;
    aplicadas int := 0;
    omitidas  int := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'nelvyon_jwt_user_id'
    ) THEN
        -- Sin la funcion, las politicas quedarian sin poder evaluarse y con
        -- FORCE eso significa cero filas para todos, incluido el propietario.
        RAISE NOTICE '591: falta nelvyon_jwt_user_id; no se aplica nada';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'agent_feedback', 'agent_outcomes', 'attribution_reports',
        'attribution_touchpoints', 'audit_log', 'booking_availability',
        'chatbot_configs', 'client_briefings', 'client_profiles',
        'cold_email_campaigns', 'cold_email_prospects', 'creative_assets',
        'digital_contracts', 'generated_logos', 'geo_ai_checks',
        'geo_ai_scores', 'heatmap_alerts', 'heatmap_sites',
        'integration_ga4', 'integration_google_ads',
        'integration_linkedin_ads', 'integration_meta_ads',
        'integration_search_console', 'integration_semrush',
        'integration_shopify', 'integration_telegram',
        'integration_tiktok_ads', 'integration_twilio', 'intent_actions',
        'intent_signals', 'os_reports', 'quality_scores',
        'roi_conversions', 'roi_events', 'roi_loops', 'roi_predictions',
        'saas_api_keys', 'saas_profile_changelog',
        'saas_user_invoices_legacy', 'sentiment_alerts',
        'sentiment_mentions', 'telegram_messages', 'transcriptions',
        'twilio_messages', 'user_roles', 'video_enhancements',
        'whatsapp_messages'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '591: % no existe; se omite', t;
            CONTINUE;
        END IF;

        SELECT data_type INTO tipo
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id';

        IF tipo IS NULL THEN
            -- Se comprueba en vez de darlo por hecho: una tabla que perdiera la
            -- columna dejaria una politica que no puede evaluarse, y con FORCE
            -- eso deja la tabla ilegible para todos.
            omitidas := omitidas + 1;
            RAISE NOTICE '591: % no tiene user_id; se omite', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        -- FORCE cierra ademas el bypass del propietario de la tabla. Sin el, el
        -- dueño seguiria viendolo todo y la politica seria decorado.
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_por_usuario_sel', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_por_usuario_ins', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_por_usuario_upd', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_por_usuario_del', t);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING ((user_id)::text = (nelvyon_jwt_user_id())::text)',
            t || '_por_usuario_sel', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ((user_id)::text = (nelvyon_jwt_user_id())::text)',
            t || '_por_usuario_ins', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING ((user_id)::text = (nelvyon_jwt_user_id())::text) '
            'WITH CHECK ((user_id)::text = (nelvyon_jwt_user_id())::text)',
            t || '_por_usuario_upd', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE USING ((user_id)::text = (nelvyon_jwt_user_id())::text)',
            t || '_por_usuario_del', t);

        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '591: RLS por usuario aplicada a % tablas (% omitidas)', aplicadas, omitidas;
END
$bloque_591$;

-- Un indice por `user_id` en cada una de ellas: con RLS, toda lectura lleva
-- `user_id = ...` obligatoriamente, y sin indice cada consulta recorre las filas
-- de todos los clientes para responder por uno. Es la misma razon por la que
-- existe la 585 para las tablas por workspace.
DO $indices_591$
DECLARE
    t text;
    creados int := 0;
BEGIN
    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id'
                             AND NOT a.attisdropped
         WHERE c.relkind = 'r'
           AND c.relrowsecurity
           AND left(c.relname, 5) <> 'cert_'
           AND NOT EXISTS (
             SELECT 1 FROM pg_index i
               JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
              WHERE i.indrelid = c.oid AND ia.attname = 'user_id'
           )
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id)', t || '_user_idx', t);
        creados := creados + 1;
    END LOOP;
    RAISE NOTICE '591: % indices por user_id creados', creados;
END
$indices_591$;
