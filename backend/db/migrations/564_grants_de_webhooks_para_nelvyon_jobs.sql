-- Privilegios minimos para que los webhooks escriban como `nelvyon_jobs`.
--
-- POR QUE HACE FALTA
-- ------------------
-- Los webhooks entrantes no tienen usuario. Bajo RLS, `nelvyon_app` no satisface
-- ninguna politica —conceden por titular o por pertenencia al workspace— asi que
-- sus escrituras se denegarian. El patron declarado para esto ya existe y lo usa
-- Autopilot y el webhook de Stripe: `nelvyon_jobs`, con `workspace_id` explicito
-- en cada sentencia.
--
-- Las rutas ya estan convertidas a ese patron. `nelvyon_jobs` NO tiene ni un
-- privilegio en 16 de las tablas implicadas, asi que sin esta migracion todas
-- esas escrituras fallan con `permission denied` en cuanto se despliegue.
--
-- DE DONDE SALE LA LISTA
-- ----------------------
-- No de una suposicion: se extrajeron las sentencias SQL de los servicios que
-- cuelgan de cada ruta y se comprobo tabla por tabla contra PRODUCCION cuales
-- privilegios faltan. Solo se concede lo que alguna sentencia necesita.
--
--   sin DELETE en ninguna    ningun webhook borra nada
--   sin UPDATE donde solo se inserta  los mensajes se anaden, no se reescriben
--   solo SELECT en oauth_tokens y whitelabel_configs  son las tablas de las que
--                            se DEDUCE el inquilino; un webhook no las modifica
--
-- DE DONDE VIENE EL AISLAMIENTO
-- -----------------------------
-- `nelvyon_jobs` tiene BYPASSRLS por diseno, asi que aqui la frontera NO es la
-- politica: es el `workspace_id` explicito que cada sentencia lleva, y el hecho
-- de que ese numero se resuelva a partir de un identificador que viaja DENTRO
-- del cuerpo firmado y que NELVYON ya tenia asociado a un workspace.
--
-- `ticket_messages` NO tiene columna `workspace_id`: su aislamiento cuelga del
-- ticket padre, que si la tiene. Se anota aqui porque es la unica de las 16 que
-- no se puede acotar por si misma.
--
-- ADITIVA. No crea, altera ni borra tablas, columnas, politicas ni filas. Solo
-- concede privilegios. Idempotente: `GRANT` repetido no cambia nada.
--
-- ROLLBACK
--   REVOKE SELECT, INSERT, UPDATE ON <las 16 tablas> FROM nelvyon_jobs;
--   (deja el estado exactamente como estaba: hoy no tiene ninguno)

DO $bloque_564$
DECLARE
    entrada text[];
    tabla text;
    privilegios text;
    concedidas int := 0;
    omitidas int := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '564: no existe el rol nelvyon_jobs; no se concede nada';
        RETURN;
    END IF;

    FOREACH entrada SLICE 1 IN ARRAY ARRAY[
        -- mensajeria entrante: conversacion se crea y se actualiza, mensajes solo se anaden
        ARRAY['instagram_dm_conversations',       'SELECT, INSERT, UPDATE'],
        ARRAY['instagram_dm_messages',            'SELECT, INSERT'],
        ARRAY['facebook_messenger_conversations', 'SELECT, INSERT, UPDATE'],
        ARRAY['facebook_messenger_messages',      'SELECT, INSERT'],
        ARRAY['tiktok_dm_conversations',          'SELECT, INSERT, UPDATE'],
        ARRAY['tiktok_dm_messages',               'SELECT, INSERT'],
        -- soporte: correo y whatsapp entrantes abren y actualizan tickets
        ARRAY['tickets',                          'SELECT, INSERT, UPDATE'],
        ARRAY['ticket_messages',                  'SELECT, INSERT'],
        ARRAY['helpdesk_tickets',                 'SELECT, INSERT, UPDATE'],
        ARRAY['contacts',                         'SELECT, INSERT, UPDATE'],
        -- pagos y presupuestos: se marca un estado sobre una fila que ya existe
        ARRAY['text2pay_payments',                'SELECT, UPDATE'],
        ARRAY['cpq_quotes',                       'SELECT, UPDATE'],
        -- telefonia y agenda
        ARRAY['dialer_calls',                     'SELECT, UPDATE'],
        ARRAY['bookings',                         'SELECT, INSERT, UPDATE'],
        -- de estas dos se DEDUCE el inquilino; no se tocan
        ARRAY['oauth_tokens',                     'SELECT'],
        ARRAY['whitelabel_configs',               'SELECT']
    ] LOOP
        tabla := entrada[1];
        privilegios := entrada[2];

        IF to_regclass(format('public.%I', tabla)) IS NULL THEN
            omitidas := omitidas + 1;
            RAISE NOTICE '564: % no existe en este despliegue; se omite', tabla;
            CONTINUE;
        END IF;

        EXECUTE format('GRANT %s ON public.%I TO nelvyon_jobs', privilegios, tabla);
        concedidas := concedidas + 1;
    END LOOP;

    RAISE NOTICE '564: privilegios concedidos en % tablas, % omitidas',
                 concedidas, omitidas;
END
$bloque_564$;

-- Las secuencias de las tablas donde se INSERTA con identificador serie. Sin
-- `USAGE` el INSERT falla con `permission denied for sequence`, que es un error
-- distinto y mas dificil de leer que el de la tabla.
DO $secuencias_564$
DECLARE
    seq text;
    n int := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RETURN;
    END IF;

    FOR seq IN
        SELECT DISTINCT pg_get_serial_sequence(format('public.%I', c.relname), a.attname)
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
         WHERE c.relkind = 'r'
           AND c.relname = ANY (ARRAY[
                'instagram_dm_conversations', 'instagram_dm_messages',
                'facebook_messenger_conversations', 'facebook_messenger_messages',
                'tiktok_dm_conversations', 'tiktok_dm_messages',
                'tickets', 'ticket_messages', 'helpdesk_tickets', 'contacts',
                'bookings'])
           AND pg_get_serial_sequence(format('public.%I', c.relname), a.attname) IS NOT NULL
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO nelvyon_jobs', seq);
        n := n + 1;
    END LOOP;

    RAISE NOTICE '564: USAGE concedido en % secuencias', n;
END
$secuencias_564$;
