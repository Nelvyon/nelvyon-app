-- Retira el privilegio que la 564 concedio de mas sobre `helpdesk_tickets`.
--
-- QUE PASO
-- --------
-- La 564 concedio a `nelvyon_jobs` SELECT, INSERT y UPDATE de tabla entera sobre
-- `helpdesk_tickets`, dentro del bloque de webhooks. Ese privilegio NO hacia
-- falta y ademas deshizo una decision anterior:
--
--   1. `helpdesk_service` no toca `helpdesk_tickets`. El camino de correo y
--      WhatsApp entrantes escribe `tickets` y `ticket_messages`. Comprobado: cero
--      apariciones de `helpdesk_tickets` en ese servicio. La tabla entro en la
--      lista de la 564 por un inventario mio que confundio las dos.
--
--   2. La migracion 555 le dio a `nelvyon_jobs` un UPDATE a nivel de COLUMNA
--      —solo `category`— sobre `helpdesk_tickets`, para que el triage de
--      Autopilot pudiera clasificar un ticket y NADA MAS. Un UPDATE de tabla
--      entera le devuelve la capacidad de cerrarlo, reasignarlo, cambiarle la
--      prioridad y reescribir las notas de resolucion. Sobre tickets de clientes
--      reales, y con un rol que BYPASSA RLS.
--
-- COMO SE VIO
-- -----------
-- No por revisar la migracion: por una bateria que lo EJECUTA.
-- `test_el_rol_de_autopilot_solo_puede_escribir_la_categoria` intenta cerrar,
-- reasignar y borrar tickets como `nelvyon_jobs` y exige que la base lo rechace.
-- Tras la 564 dejo de rechazarlo.
--
-- El trinquete de privilegios NO lo detecto, y merece anotarse: compara QUE
-- TABLAS alcanza el rol, no QUE PUEDE HACER en ellas. `helpdesk_tickets` ya
-- estaba en su lista por el SELECT de la 555, asi que el ensanchamiento de
-- columna a tabla le resulto invisible.
--
-- QUE HACE ESTA MIGRACION
-- -----------------------
-- Retira INSERT y UPDATE de tabla sobre `helpdesk_tickets`. El SELECT se queda:
-- lo concedio la 555 y el vigilante lo usa. El UPDATE de columna sobre
-- `category` tambien se queda, y por eso se REAPLICA explicitamente: revocar el
-- UPDATE de tabla en PostgreSQL retira tambien los privilegios de columna, asi
-- que sin volver a concederlo el triage de Autopilot se quedaria sin poder
-- clasificar. Ese es justo el efecto que no se quiere.
--
-- ADITIVA EN DATOS: no toca ni una fila, ni una tabla, ni una politica, ni un
-- rol. Solo retira un privilegio concedido hoy y restituye el que ya existia.
--
-- ROLLBACK
--   GRANT INSERT, UPDATE ON public.helpdesk_tickets TO nelvyon_jobs;
--   (devuelve exactamente el estado que dejo la 564)

DO $bloque_565$
DECLARE
    tenia_columna boolean;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '565: no existe el rol nelvyon_jobs; nada que revocar';
        RETURN;
    END IF;

    IF to_regclass('public.helpdesk_tickets') IS NULL THEN
        RAISE NOTICE '565: helpdesk_tickets no existe en este despliegue';
        RETURN;
    END IF;

    -- Se anota si el privilegio de columna estaba, para restituir solo lo que
    -- habia y no inventar uno nuevo.
    SELECT EXISTS (
        SELECT 1 FROM information_schema.column_privileges
         WHERE grantee = 'nelvyon_jobs' AND table_schema = 'public'
           AND table_name = 'helpdesk_tickets' AND column_name = 'category'
           AND privilege_type = 'UPDATE'
    ) INTO tenia_columna;

    REVOKE INSERT, UPDATE ON public.helpdesk_tickets FROM nelvyon_jobs;

    -- `REVOKE UPDATE` de tabla se lleva por delante el de columna. Sin esto, el
    -- triage de Autopilot dejaria de poder clasificar tickets — que es
    -- exactamente el efecto que esta migracion quiere evitar.
    GRANT UPDATE (category) ON public.helpdesk_tickets TO nelvyon_jobs;

    RAISE NOTICE '565: retirado INSERT/UPDATE de tabla; UPDATE(category) %',
                 CASE WHEN tenia_columna THEN 'restituido' ELSE 'concedido (no estaba)' END;
END
$bloque_565$;
