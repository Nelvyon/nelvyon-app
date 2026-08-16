-- Cierra los huecos de politica que hoy impiden activar Row Level Security.
--
-- EL PROBLEMA, MEDIDO
-- -------------------
-- NELVYON declara 969 politicas sobre 317 tablas (266 con FORCE ROW LEVEL
-- SECURITY). La aplicacion se conecta como superusuario, asi que ninguna se
-- evalua. El dia que se retire ese privilegio, empiezan a decidir — y hay
-- tablas con RLS activo a las que les falta la politica del verbo:
--
--     28 tablas con RLS y sin politica de INSERT
--     13 tablas con RLS y sin politica de SELECT
--     10 tablas con RLS y sin NINGUNA politica
--
-- Una tabla con RLS y sin la politica del verbo correspondiente no deniega con
-- error: devuelve cero filas, o descarta la escritura. Un fallo que se
-- manifiesta como datos que desaparecen es peor que uno que revienta, porque
-- nadie lo ve hasta que un cliente reclama.
--
-- LA IDENTIDAD CANONICA, YA DECIDIDA
-- ----------------------------------
--     request.jwt.claim.sub  -> identidad de USUARIO   (nelvyon_jwt_user_id())
--     app.tenant_id          -> identidad de INQUILINO (current_tenant_id())
--
-- `backend/core/contexto_rls.py` fija las dos con `set_config(..., true)` al
-- empezar CADA transaccion. Esta migracion solo escribe politicas que se apoyan
-- en esas dos variables: cualquier otra —`app.workspace_id`, por ejemplo— no la
-- fija nadie hoy, y una politica que dependiera de ella denegaria siempre.
--
-- POR QUE `workspace_id = current_tenant_id()`
-- --------------------------------------------
-- No es una equivalencia inventada aqui: es la que ya usan 20 politicas del
-- esquema, y la que implementa el propio backend. Todos los servicios de estas
-- tablas llaman a `TenantService.set_tenant_context(workspace_id)`, que hace
-- `set_config('app.tenant_id', workspace_id)`. La columna `workspace_id` entera
-- y `app.tenant_id` contienen el mismo numero por construccion.
--
-- LO QUE ESTA MIGRACION NO HACE
-- -----------------------------
-- No activa RLS en ninguna tabla nueva, no lo retira de ninguna, no toca el rol
-- de conexion ni retira BYPASSRLS a nadie. Deja las politicas listas y
-- certificables. Retirar el privilegio es una decision de despliegue aparte.
--
-- IDEMPOTENTE
-- -----------
-- Todo pasa por `nelvyon_rls_crear_politica`, que hace `DROP POLICY IF EXISTS`
-- seguido de `CREATE POLICY` y se salta las tablas que no existan. Reaplicarla
-- N veces deja exactamente el mismo estado.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. AYUDANTES
-- ═══════════════════════════════════════════════════════════════════════════

-- `app.tenant_id` (workspace entero) -> `saas_tenants.id` (uuid).
--
-- Hace falta porque parte del esquema lo creo la generacion `/saas` y acota por
-- `tenant_id uuid`, no por workspace entero. La traduccion ya existe en el
-- esquema (`saas_tenants.workspace_id`) y es la misma que usa
-- `backend/core/tenant_bridge.py`, asi que la politica y la aplicacion resuelven
-- el mismo inquilino o ninguno.
--
-- SECURITY DEFINER porque `saas_tenants` tiene sus propias politicas: sin el, la
-- traduccion se evaluaria bajo el RLS del llamante y devolveria NULL, que es
-- justo el modo de fallo silencioso que esta migracion viene a cerrar.
--
-- Devuelve NULL sin contexto -> la comparacion es NULL -> la fila no pasa.
-- Fail-closed sin excepciones.
CREATE OR REPLACE FUNCTION public.nelvyon_rls_tenant_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT st.id
       FROM public.saas_tenants st
      WHERE st.workspace_id = public.current_tenant_id()
      LIMIT 1),
    public.nelvyon_current_saas_tenant_uuid()
  );
$$;

-- Existe ese codigo de afiliado? Solo eso: no revela nada del afiliado.
--
-- SECURITY DEFINER a proposito y con alcance minimo. La comprobacion la necesita
-- la INGESTA PUBLICA de clics y conversiones —un visitante anonimo que llega por
-- un enlace de afiliado no tiene identidad ninguna—, y `affiliate_profiles` solo
-- deja ver el perfil propio. Sin el DEFINER, la subconsulta veria cero perfiles
-- y la ingesta quedaria muerta.
CREATE OR REPLACE FUNCTION public.nelvyon_rls_codigo_afiliado_existe(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_code IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.affiliate_profiles ap WHERE ap.code = p_code);
$$;

-- Crea una politica de forma idempotente. Se borra al final de la migracion:
-- es andamiaje, no parte del esquema.
CREATE OR REPLACE FUNCTION public.nelvyon_rls_crear_politica(
    p_tabla   text,
    p_nombre  text,
    p_cmd     text,
    p_using   text DEFAULT NULL,
    p_check   text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_sql text;
BEGIN
    IF to_regclass(format('public.%I', p_tabla)) IS NULL THEN
        RAISE NOTICE '540: la tabla % no existe; politica % omitida', p_tabla, p_nombre;
        RETURN;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_nombre, p_tabla);

    v_sql := format('CREATE POLICY %I ON public.%I FOR %s', p_nombre, p_tabla, p_cmd);
    IF p_using IS NOT NULL THEN
        v_sql := v_sql || format(' USING (%s)', p_using);
    END IF;
    IF p_check IS NOT NULL THEN
        v_sql := v_sql || format(' WITH CHECK (%s)', p_check);
    END IF;
    EXECUTE v_sql;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DATOS DE INQUILINO — eje `workspace_id`
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Diecinueve tablas cuya columna de propiedad es `workspace_id` entero. Reciben
-- las cuatro operaciones sobre el mismo predicado, salvo las excepciones que se
-- justifican al pie de este bloque.
--
-- NO se usa `USING (true)` en ninguna: eso convertiria el aislamiento en
-- decorado. El predicado es siempre una comparacion contra la columna real.

DO $bloque_workspace$
DECLARE
    v_tabla text;
    -- Tablas con propiedad limpia por workspace y ciclo de vida completo:
    -- el inquilino crea, lee, modifica y borra lo suyo.
    v_completas text[] := ARRAY[
        'landing_pages',
        'loyalty_programs',
        'loyalty_points',
        'loyalty_transactions',
        'os_store_discounts',
        'os_store_pages',
        'os_store_products',
        'os_store_projects',
        'os_website_pages',
        'os_website_projects',
        'sms_campaigns',
        'sms_conversations',
        'sms_messages',
        'sms_optouts'
    ];
    v_pred text := 'workspace_id = public.current_tenant_id()';
BEGIN
    FOREACH v_tabla IN ARRAY v_completas LOOP
        PERFORM public.nelvyon_rls_crear_politica(v_tabla, v_tabla || '_rls_select', 'SELECT', v_pred, NULL);
        PERFORM public.nelvyon_rls_crear_politica(v_tabla, v_tabla || '_rls_insert', 'INSERT', NULL,   v_pred);
        PERFORM public.nelvyon_rls_crear_politica(v_tabla, v_tabla || '_rls_update', 'UPDATE', v_pred, v_pred);
        PERFORM public.nelvyon_rls_crear_politica(v_tabla, v_tabla || '_rls_delete', 'DELETE', v_pred, NULL);
    END LOOP;
END;
$bloque_workspace$;

-- `ab_experiments`: tiene los dos ejes, y `workspace_id` es NULLABLE porque la
-- tabla nacio en la generacion `/saas` acotando por `user_id uuid` y el
-- workspace se le anadio despues. Acotar solo por workspace dejaria las filas
-- antiguas invisibles para su propio dueno — datos que desaparecen, otra vez.
-- Por eso el predicado admite cualquiera de las dos identidades REALES de la
-- fila. Sin contexto, las dos son NULL y no pasa ninguna.
DO $bloque_ab$
DECLARE
    v_pred text := '(workspace_id = public.current_tenant_id() '
                || ' OR user_id = public.nelvyon_jwt_user_id())';
    -- Las variantes no tienen `user_id`: cuelgan del experimento. Su
    -- `workspace_id` tambien es nullable, asi que se admite ademas la
    -- pertenencia a un experimento propio.
    v_pred_var text := '(workspace_id = public.current_tenant_id() '
                    || ' OR experiment_id IN (SELECT e.id FROM public.ab_experiments e '
                    || '     WHERE e.workspace_id = public.current_tenant_id() '
                    || '        OR e.user_id = public.nelvyon_jwt_user_id()))';
BEGIN
    PERFORM public.nelvyon_rls_crear_politica('ab_experiments', 'ab_experiments_rls_select', 'SELECT', v_pred, NULL);
    PERFORM public.nelvyon_rls_crear_politica('ab_experiments', 'ab_experiments_rls_insert', 'INSERT', NULL,   v_pred);
    PERFORM public.nelvyon_rls_crear_politica('ab_experiments', 'ab_experiments_rls_update', 'UPDATE', v_pred, v_pred);
    PERFORM public.nelvyon_rls_crear_politica('ab_experiments', 'ab_experiments_rls_delete', 'DELETE', v_pred, NULL);

    PERFORM public.nelvyon_rls_crear_politica('ab_variants', 'ab_variants_rls_select', 'SELECT', v_pred_var, NULL);
    PERFORM public.nelvyon_rls_crear_politica('ab_variants', 'ab_variants_rls_insert', 'INSERT', NULL,       v_pred_var);
    PERFORM public.nelvyon_rls_crear_politica('ab_variants', 'ab_variants_rls_update', 'UPDATE', v_pred_var, v_pred_var);
    PERFORM public.nelvyon_rls_crear_politica('ab_variants', 'ab_variants_rls_delete', 'DELETE', v_pred_var, NULL);
END;
$bloque_ab$;

-- `os_store_orders`: SELECT y UPDATE por workspace. El INSERT ya lo tiene y es
-- PUBLICO a proposito —lo hace el comprador anonimo en el checkout, acotado a
-- proyectos publicados—, asi que no se toca. NO recibe DELETE: un pedido es un
-- registro financiero; si hay que retirarlo, se hace por mantenimiento y queda
-- rastro. Esa ausencia es una decision, no un olvido.
DO $bloque_pedidos$
DECLARE
    v_pred text := 'workspace_id = public.current_tenant_id()';
BEGIN
    PERFORM public.nelvyon_rls_crear_politica('os_store_orders', 'os_store_orders_rls_select', 'SELECT', v_pred, NULL);
    PERFORM public.nelvyon_rls_crear_politica('os_store_orders', 'os_store_orders_rls_update', 'UPDATE', v_pred, v_pred);
END;
$bloque_pedidos$;

-- Telemetria de solo-anadir. `qr_scans` y `landing_analytics` ya tienen su
-- INSERT publico —los escribe el visitante anonimo al escanear o al ver una
-- pagina publicada—, y les faltaba el SELECT: sin el, el dueno no puede leer sus
-- propias metricas. Reciben SELECT y nada mas: una linea de telemetria no se
-- edita ni se borra fila a fila; la retencion es mantenimiento.
DO $bloque_telemetria$
BEGIN
    PERFORM public.nelvyon_rls_crear_politica(
        'qr_scans', 'qr_scans_rls_select', 'SELECT',
        'workspace_id = public.current_tenant_id()', NULL);

    -- `landing_analytics` no tiene columna de propiedad: cuelga de la pagina.
    -- El predicado la sigue hasta `landing_pages.workspace_id`, que si la tiene.
    PERFORM public.nelvyon_rls_crear_politica(
        'landing_analytics', 'landing_analytics_rls_select', 'SELECT',
        'page_id IN (SELECT lp.id FROM public.landing_pages lp '
        || 'WHERE lp.workspace_id = public.current_tenant_id())', NULL);
END;
$bloque_telemetria$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. DATOS DE INQUILINO — eje `tenant_id` entero
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `chat_conversations` guarda el inquilino en `tenant_id INTEGER`, y ahi el
-- entero ES el workspace: `livechat_service` hace `set_tenant_context(tenant_id)`
-- con el mismo numero que escribe en la columna.

DO $bloque_chat$
DECLARE
    v_pred text := 'tenant_id = public.current_tenant_id()';
    -- `chat_messages` no tiene columna de inquilino: cuelga de la conversacion.
    -- Se sigue la referencia en vez de inventarle un eje. La subconsulta se
    -- evalua bajo el RLS de `chat_conversations`, que acota por el mismo
    -- inquilino, asi que las dos politicas no pueden contradecirse.
    v_pred_msg text := 'conversation_id IN (SELECT c.id FROM public.chat_conversations c '
                    || 'WHERE c.tenant_id = public.current_tenant_id())';
BEGIN
    PERFORM public.nelvyon_rls_crear_politica('chat_conversations', 'chat_conversations_rls_select', 'SELECT', v_pred, NULL);
    PERFORM public.nelvyon_rls_crear_politica('chat_conversations', 'chat_conversations_rls_insert', 'INSERT', NULL,   v_pred);
    PERFORM public.nelvyon_rls_crear_politica('chat_conversations', 'chat_conversations_rls_update', 'UPDATE', v_pred, v_pred);
    PERFORM public.nelvyon_rls_crear_politica('chat_conversations', 'chat_conversations_rls_delete', 'DELETE', v_pred, NULL);

    PERFORM public.nelvyon_rls_crear_politica('chat_messages', 'chat_messages_rls_select', 'SELECT', v_pred_msg, NULL);
    PERFORM public.nelvyon_rls_crear_politica('chat_messages', 'chat_messages_rls_insert', 'INSERT', NULL,       v_pred_msg);
    PERFORM public.nelvyon_rls_crear_politica('chat_messages', 'chat_messages_rls_update', 'UPDATE', v_pred_msg, v_pred_msg);
    PERFORM public.nelvyon_rls_crear_politica('chat_messages', 'chat_messages_rls_delete', 'DELETE', v_pred_msg, NULL);
END;
$bloque_chat$;

-- `gdpr_user_consents` ya tenia SELECT e INSERT por inquilino. Le faltaban
-- UPDATE y DELETE, y los necesita de verdad: retirar un consentimiento es un
-- UPDATE, y el derecho de supresion es un DELETE. Sin ellos, la aplicacion no
-- podria cumplir el propio reglamento que la tabla existe para registrar.
DO $bloque_gdpr$
DECLARE
    v_pred text := 'tenant_id = public.current_tenant_id()';
BEGIN
    PERFORM public.nelvyon_rls_crear_politica('gdpr_user_consents', 'gdpr_user_consents_rls_update', 'UPDATE', v_pred, v_pred);
    PERFORM public.nelvyon_rls_crear_politica('gdpr_user_consents', 'gdpr_user_consents_rls_delete', 'DELETE', v_pred, NULL);
END;
$bloque_gdpr$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. DATOS DE INQUILINO — eje `tenant_id` uuid
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `qr_codes` no tenia NINGUNA politica y su columna es `tenant_id uuid` con
-- clave foranea a `saas_tenants`. Se traduce el contexto con
-- `nelvyon_rls_tenant_uuid()`, exactamente igual que hace `qr_service` con
-- `require_tenant_uuid`. Su `workspace_id` entero existe pero es nullable y el
-- servicio no lo usa para filtrar: acotar por el dejaria filas huerfanas.

DO $bloque_qr$
DECLARE
    v_pred text := 'tenant_id = public.nelvyon_rls_tenant_uuid()';
BEGIN
    PERFORM public.nelvyon_rls_crear_politica('qr_codes', 'qr_codes_rls_select', 'SELECT', v_pred, NULL);
    PERFORM public.nelvyon_rls_crear_politica('qr_codes', 'qr_codes_rls_insert', 'INSERT', NULL,   v_pred);
    PERFORM public.nelvyon_rls_crear_politica('qr_codes', 'qr_codes_rls_update', 'UPDATE', v_pred, v_pred);
    PERFORM public.nelvyon_rls_crear_politica('qr_codes', 'qr_codes_rls_delete', 'DELETE', v_pred, NULL);
END;
$bloque_qr$;

-- `audit_logs` ya tiene SELECT e INSERT por inquilino y NO recibe UPDATE ni
-- DELETE. No es un hueco: un registro de auditoria que su propio inquilino
-- pudiera reescribir o borrar no auditaria nada. La ausencia de esas dos
-- politicas ES el control.

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DATOS DE USUARIO — eje `request.jwt.claim.sub`
-- ═══════════════════════════════════════════════════════════════════════════

DO $bloque_usuario$
DECLARE
    v_pred text := 'user_id = public.nelvyon_jwt_user_id()';
BEGIN
    -- Le faltaba el INSERT: un usuario podia ver y editar su perfil de afiliado
    -- pero no darse de alta. No recibe DELETE — un perfil con comisiones
    -- pendientes no se borra, se da de baja cambiando `status`.
    PERFORM public.nelvyon_rls_crear_politica('affiliate_profiles', 'affiliate_profiles_rls_insert', 'INSERT', NULL, v_pred);

    -- Tenia SELECT y DELETE por usuario, pero ni INSERT ni UPDATE: conectar una
    -- cuenta OAuth o refrescar su token habrian fallado en silencio.
    PERFORM public.nelvyon_rls_crear_politica('oauth_connections', 'oauth_connections_rls_insert', 'INSERT', NULL,  v_pred);
    PERFORM public.nelvyon_rls_crear_politica('oauth_connections', 'oauth_connections_rls_update', 'UPDATE', v_pred, v_pred);

    -- Quien escribe una sugerencia puede corregirla o retirarla.
    PERFORM public.nelvyon_rls_crear_politica('feedback_items', 'feedback_items_rls_update', 'UPDATE', v_pred, v_pred);
    PERFORM public.nelvyon_rls_crear_politica('feedback_items', 'feedback_items_rls_delete', 'DELETE', v_pred, NULL);
END;
$bloque_usuario$;

-- `support_tickets` no recibe DELETE y `nps_responses` no recibe ni UPDATE ni
-- DELETE. Tampoco son huecos: un ticket de soporte es la prueba de una
-- conversacion con el cliente y una respuesta de NPS pierde todo su valor si
-- quien la dio puede reescribirla despues. Ambas son de solo-anadir por diseno.

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ATRIBUCION DE AFILIADOS — ingesta publica acotada
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `affiliate_clicks` no tenia ninguna politica y `affiliate_conversions` solo
-- SELECT. Las dos se escriben cuando un visitante ANONIMO llega por un enlace de
-- afiliado o convierte: en ese instante no hay usuario ni inquilino en el
-- contexto, porque todavia no ha iniciado sesion nadie. Es el mismo caso que
-- `landing_analytics`, `qr_scans` y `os_store_orders`, y se resuelve igual que
-- ya lo resuelve el esquema: el WITH CHECK acota la ingesta a codigos que
-- EXISTEN. No es `true` disfrazado — rechaza cualquier codigo inventado.
--
-- La lectura si tiene dueno: el afiliado ve los clics de SUS codigos, con el
-- mismo predicado que ya usa `affiliate_conversions_select_own`.

DO $bloque_afiliados$
BEGIN
    PERFORM public.nelvyon_rls_crear_politica(
        'affiliate_clicks', 'affiliate_clicks_rls_select', 'SELECT',
        'code IN (SELECT ap.code FROM public.affiliate_profiles ap '
        || 'WHERE ap.user_id = public.nelvyon_jwt_user_id())', NULL);
    PERFORM public.nelvyon_rls_crear_politica(
        'affiliate_clicks', 'affiliate_clicks_rls_insert', 'INSERT',
        NULL, 'public.nelvyon_rls_codigo_afiliado_existe(code)');

    PERFORM public.nelvyon_rls_crear_politica(
        'affiliate_conversions', 'affiliate_conversions_rls_insert', 'INSERT',
        NULL, 'public.nelvyon_rls_codigo_afiliado_existe(code)');
END;
$bloque_afiliados$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. CATALOGOS GLOBALES — se quedan como estan, y eso es la decision
-- ═══════════════════════════════════════════════════════════════════════════
--
--     landing_templates, os_store_templates, os_website_templates
--     changelog_entries, roadmap_items
--
-- Cinco tablas sin dueno: plantillas por defecto y contenido de producto. Las
-- cinco ya tienen `SELECT USING (true)`, que es lo correcto — son globales y
-- publicas a proposito. NO reciben politica de INSERT, y no por descuido:
--
--   * Nadie las escribe desde una peticion. Las plantillas las siembra
--     `_seed_templates()`, que abre su propia sesion contra `db_manager` sin
--     contexto ninguno; el changelog y el roadmap solo se LEEN en todo el
--     codigo (`ChangelogService.ts`), y se cargan por mantenimiento.
--   * Darles un INSERT tendria que ser `WITH CHECK (true)`, porque no hay
--     columna de propiedad contra la que comparar. Eso abriria la escritura de
--     contenido compartido a cualquier rol con el GRANT — un empeoramiento real
--     a cambio de un numero mas bonito.
--
-- Quedan por tanto como residuo DECLARADO de «sin politica de INSERT»: cinco
-- tablas, todas de catalogo global, todas escritas por el rol de fondo de la
-- seccion 8. El test lo comprueba tabla por tabla y falla si esa lista cambia.
--
-- Tampoco se les retira ROW LEVEL SECURITY. Mantenerlo con SELECT abierto y sin
-- escritura deja la tabla fail-closed para escrituras; desactivarlo la dejaria
-- escribible por cualquiera con el GRANT. Entre las dos opciones que permite el
-- caso, esta es la estricta.

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. JOBS Y MANTENIMIENTO — un rol dedicado, no politicas abiertas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Quedan escrituras legitimas que ocurren SIN contexto de peticion: la siembra
-- de plantillas al arrancar, la carga del changelog, la retencion de telemetria,
-- las tareas de mantenimiento. Habia dos formas de resolverlo:
--
--   (a) anadir politicas permisivas a esas tablas — que abriria el mismo agujero
--       para el trafico normal, porque una politica no distingue quien la usa;
--   (b) un rol dedicado con BYPASSRLS, usado SOLO por procesos de fondo.
--
-- Se elige (b). El privilegio queda acotado a un rol identificable, auditable en
-- `pg_stat_activity`, y el trafico de la aplicacion NO lo tiene: la aplicacion
-- seguira conectandose con un rol sin BYPASSRLS y pasando por las politicas de
-- arriba. Un BYPASSRLS para el trafico normal seria desactivar RLS con otro
-- nombre.
--
-- El rol se crea NOLOGIN y sin contrasena: esta migracion DECLARA el mecanismo,
-- no reparte credenciales. Habilitarlo es un acto explicito del operador:
--
--     ALTER ROLE nelvyon_jobs LOGIN PASSWORD '<secreto>';
--
-- Los GRANT se limitan a las tablas de catalogo de la seccion 7, que son las que
-- el rol necesita hoy. Cualquier otra tabla que un job necesite se concede
-- explicitamente, una a una, y queda por escrito.

DO $bloque_rol_jobs$
DECLARE
    v_tabla text;
    v_tablas text[] := ARRAY[
        'landing_templates',
        'os_store_templates',
        'os_website_templates',
        'changelog_entries',
        'roadmap_items'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        CREATE ROLE nelvyon_jobs NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
        RAISE NOTICE '540: rol nelvyon_jobs creado (NOLOGIN, BYPASSRLS)';
    ELSE
        -- Solo se reafirma BYPASSRLS. No se toca LOGIN: si el operador ya le dio
        -- credenciales, reaplicar la migracion no debe quitarselas.
        ALTER ROLE nelvyon_jobs BYPASSRLS;
    END IF;

    EXECUTE 'GRANT USAGE ON SCHEMA public TO nelvyon_jobs';
    FOREACH v_tabla IN ARRAY v_tablas LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NOT NULL THEN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO nelvyon_jobs', v_tabla);
        END IF;
    END LOOP;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '540: sin privilegio para declarar el rol nelvyon_jobs. '
                     'Crearlo a mano: CREATE ROLE nelvyon_jobs NOLOGIN BYPASSRLS;';
END;
$bloque_rol_jobs$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. LIMPIEZA DEL ANDAMIAJE
-- ═══════════════════════════════════════════════════════════════════════════
-- El creador de politicas era de esta migracion, no del esquema. Se retira para
-- que no quede una via generica de crear politicas por nombre en la base.
DROP FUNCTION IF EXISTS public.nelvyon_rls_crear_politica(text, text, text, text, text);
