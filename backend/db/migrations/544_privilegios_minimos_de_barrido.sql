-- `nelvyon_jobs` recibe exactamente los privilegios que sus caminos ejecutan.
--
-- EL FALLO QUE ESTO IMPIDE
-- ------------------------
-- La 540 creo el rol `nelvyon_jobs` y le concedio DML sobre cinco catalogos
-- publicos. Eso bastaba entonces porque el rol no tenia LOGIN y nadie se
-- conectaba como el.
--
-- Al preparar la activacion parcial de RLS aparecio el agujero: en cuanto el API
-- deja de usar un rol con BYPASSRLS, `core.database.sesion_de_barrido()` abre una
-- conexion real como `nelvyon_jobs`, y el webhook de Stripe escribe
-- `subscriptions` por esa via. El rol no tenia NINGUN privilegio sobre esa tabla:
--
--     ERROR: permission denied for table subscriptions
--
-- Es la ruta de cobro. Un evento `customer.subscription.created` habria muerto
-- ahi, Stripe habria reintentado hasta agotarse y la suscripcion no se habria
-- registrado nunca. La bateria anterior no lo vio porque
-- `test_rls_webhook_stripe_sistema.py` comprueba el ORDEN de la operacion —que la
-- sesion se abra despues de `construct_event`— y no el PRIVILEGIO: con el rol en
-- NOLOGIN, ninguna prueba llego a conectarse como el.
--
-- COMO SE DETERMINO LA LISTA
-- --------------------------
-- No por intuicion ni concediendo de mas. Se partio de los cuatro puntos del
-- codigo que abren `sesion_de_barrido()`, se siguieron las llamadas internas de
-- forma transitiva y se extrajo el SQL SOLO de los metodos alcanzables desde cada
-- uno. Una tabla que aparece unicamente en un metodo que el barrido no puede
-- ejecutar —`delete_post`, que solo alcanza una ruta de API— NO se concede.
--
-- Eso recorta de verdad. El barrido social, leido entero, parecia necesitar
-- INSERT y UPDATE sobre `social_accounts` y `social_post_analytics`; por los
-- metodos que realmente invoca (`fetch_due_scheduled_posts`, `increment_retry`,
-- `publish_post_by_id`) solo necesita SELECT sobre la primera y nada sobre la
-- segunda.
--
-- EL MAPA: consumidor -> tabla -> operacion
-- -----------------------------------------
--   routers/stripe_webhook.py
--     subscriptions ................. SELECT, INSERT, UPDATE
--
--   services/finetuning_worker.py
--     workspace_models .............. SELECT, INSERT, UPDATE
--     campaigns ..................... SELECT
--     chatbot_conversations ......... SELECT
--     social_posts .................. SELECT
--     social_post_analytics ......... SELECT
--     tickets ....................... SELECT
--     ticket_messages ............... SELECT
--
--   services/social_scheduler_worker.py
--     social_posts .................. SELECT, UPDATE
--     social_accounts ............... SELECT
--
--   services/reporting_worker.py
--     executive_reports ............. SELECT, INSERT, UPDATE
--     report_schedules .............. SELECT, UPDATE
--     workspaces .................... SELECT
--     workspace_members ............. SELECT
--     campaigns ..................... SELECT
--     chatbot_conversations ......... SELECT
--     crm_contacts .................. SELECT
--     crm_deals ..................... SELECT
--     public_analytics_events ....... SELECT
--     social_posts .................. SELECT
--     social_post_analytics ......... SELECT
--
-- POR QUE NO HAY NINGUN DELETE
-- ----------------------------
-- Ninguno de los cuatro caminos borra. `SubscriptionsService.delete` existe pero
-- el procesador de Stripe solo invoca `get_list`, `update` y `create`;
-- `delete_post` del planificador social solo lo alcanza una ruta de API, que va
-- por la sesion normal. Conceder DELETE «por si acaso» le daria a un job la
-- capacidad de vaciar `subscriptions` saltandose RLS, que es justo lo que este
-- rol no debe poder hacer.
--
-- POR QUE NO SE CONCEDE NINGUNA SECUENCIA
-- ---------------------------------------
-- Las tres tablas donde el rol inserta —`subscriptions`, `workspace_models` y
-- `executive_reports`— tienen la clave primaria en `uuid` con
-- `gen_random_uuid()`. No hay `nextval` en juego, asi que un GRANT sobre
-- secuencias seria privilegio muerto. Comprobado contra el esquema real, no
-- deducido del modelo: `models/subscriptions.py` declara ese `id` como `Integer`
-- autoincremental y la columna real es `uuid`. La divergencia no la corrige esta
-- migracion —no toca esquema— pero queda anotada aqui porque cualquiera que lea
-- el modelo llegara a la conclusion contraria.
--
-- LO QUE ESTA MIGRACION NO HACE
-- -----------------------------
-- No da LOGIN al rol ni le pone contrasena: eso es una operacion de credenciales,
-- va fuera del control de versiones y queda en el runbook. No retira BYPASSRLS,
-- que es la razon de ser del rol: los barridos son cross-tenant por definicion y
-- no tienen un inquilino que fijar. No concede nada sobre `stripe_webhook_events`
-- ni `saas_tenants` —el webhook las escribe con la sesion NORMAL, y ninguna de
-- las dos tiene RLS activo— ni sobre ninguna tabla que el API sirva a un usuario.
--
-- IDEMPOTENTE
-- -----------
-- `GRANT` es idempotente por naturaleza y el bloque comprueba que la tabla exista
-- antes de tocarla. Reaplicarla no falla ni amplia el alcance.

DO $bloque_privilegios_barrido$
DECLARE
    v_tabla   text;
    v_faltan  text[] := ARRAY[]::text[];

    -- SELECT + INSERT + UPDATE. Las tres tablas donde un barrido escribe filas
    -- nuevas y las actualiza despues.
    v_escritura text[] := ARRAY[
        'subscriptions',
        'workspace_models',
        'executive_reports'
    ];

    -- SELECT + UPDATE. Se modifican filas existentes, nunca se crean.
    v_actualizacion text[] := ARRAY[
        'report_schedules',
        'social_posts'
    ];

    -- SELECT. Lectura para decidir a quien le toca o para componer metricas.
    v_lectura text[] := ARRAY[
        'social_accounts',
        'social_post_analytics',
        'campaigns',
        'chatbot_conversations',
        'crm_contacts',
        'crm_deals',
        'public_analytics_events',
        'tickets',
        'ticket_messages',
        'workspaces',
        'workspace_members'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '544: el rol nelvyon_jobs no existe; la 540 no pudo crearlo. '
                     'Nada que conceder.';
        RETURN;
    END IF;

    -- El esquema ya se lo concedio la 540; se reafirma por si esta migracion se
    -- aplica sobre una base donde aquel GRANT se perdio.
    EXECUTE 'GRANT USAGE ON SCHEMA public TO nelvyon_jobs';

    FOREACH v_tabla IN ARRAY v_escritura LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            v_faltan := v_faltan || v_tabla;
            CONTINUE;
        END IF;
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE ON public.%I TO nelvyon_jobs', v_tabla);
    END LOOP;

    FOREACH v_tabla IN ARRAY v_actualizacion LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            v_faltan := v_faltan || v_tabla;
            CONTINUE;
        END IF;
        EXECUTE format(
            'GRANT SELECT, UPDATE ON public.%I TO nelvyon_jobs', v_tabla);
    END LOOP;

    FOREACH v_tabla IN ARRAY v_lectura LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            v_faltan := v_faltan || v_tabla;
            CONTINUE;
        END IF;
        EXECUTE format(
            'GRANT SELECT ON public.%I TO nelvyon_jobs', v_tabla);
    END LOOP;

    -- Una tabla ausente no es motivo para abortar —hay entornos parciales— pero
    -- tiene que verse. Si la que falta es `subscriptions`, el webhook de cobro
    -- seguira roto y nadie deberia enterarse en produccion.
    IF array_length(v_faltan, 1) IS NOT NULL THEN
        RAISE WARNING '544: tablas ausentes, sin conceder: %', v_faltan;
    END IF;

    RAISE NOTICE '544: privilegios minimos concedidos a nelvyon_jobs sobre % tablas',
        array_length(v_escritura, 1) + array_length(v_actualizacion, 1)
        + array_length(v_lectura, 1) - coalesce(array_length(v_faltan, 1), 0);
END
$bloque_privilegios_barrido$;

COMMENT ON ROLE nelvyon_jobs IS
    'Barridos cross-tenant y webhook de Stripe. BYPASSRLS a proposito: no tienen '
    'inquilino que fijar. Privilegios acotados por la 544 a las tablas que sus '
    'caminos ejecutan de verdad, sin DELETE en ninguna. Cualquier tabla nueva que '
    'un job necesite se concede explicitamente en una migracion, una a una.';
