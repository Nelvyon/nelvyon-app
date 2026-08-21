-- Las tablas que GOBIERNAN a NELVYON dejan de ser escribibles por la aplicacion.
--
-- QUE SE DESCUBRIO
-- ----------------
-- Un `ALTER DEFAULT PRIVILEGES` del rol `postgres` concede `arwd` —SELECT,
-- INSERT, UPDATE y DELETE— sobre TODA tabla nueva al rol `nelvyon_app`. Es una
-- postura de plataforma anterior a esto y afecta a 383 tablas.
--
-- Para las tablas de inquilino no es un problema: tienen RLS forzado, y RLS es
-- justamente la defensa que convierte «puede escribir» en «puede escribir LO
-- SUYO». Pero las tablas de PLATAFORMA no tienen RLS, porque no tienen inquilino
-- contra el que filtrar. Ahi el GRANT es la unica frontera, y estaba abierta.
--
-- LAS CINCO QUE IMPORTAN DE VERDAD
-- --------------------------------
--   agent_policies         lo que cada agente puede hacer. Un sistema que puede
--                          reescribir su propia politica no tiene politica.
--   agent_kill_switch      el freno de emergencia. Poder desactivarlo desde la
--                          via de la aplicacion es no tener freno.
--   agent_catalog          que herramientas y presupuesto tiene cada agente.
--   autopilot_capabilities la clasificacion de riesgo: que se ejecuta solo y que
--                          exige aprobacion. Es la frontera del producto entero.
--   plan_rango             que plan da derecho a que. Reescribirlo regala plan.
--
-- Y `_migrations`, el registro de lo aplicado: si se puede reescribir, deja de
-- ser prueba de nada.
--
-- QUE NO ES ESTO
-- --------------
-- NO es un barrido de las 383. Arreglar eso a ciegas seria temerario: muchas de
-- esas tablas SI las escribe la aplicacion legitimamente, y otras necesitan RLS
-- en vez de una revocacion. Queda registrado como hallazgo aparte.
--
-- QUE PASA CON EL OPERADOR
-- ------------------------
-- Activar el freno o cambiar una politica sigue siendo posible: es una accion de
-- OPERADOR, con conexion de administracion, no una peticion HTTP. Hoy no hay
-- ninguna ruta que lo haga, y si algun dia se quiere una, tendra que concederse
-- su privilegio a proposito — que es exactamente el punto.
--
-- NO TOCA NI UNA FILA
-- -------------------
-- Solo retira permisos. Cero DELETE, cero UPDATE, cero DROP. Reversible con un
-- GRANT.

DO $bloque_559$
DECLARE
    t text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_app') THEN
        RAISE NOTICE '559: no existe nelvyon_app; nada que retirar';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'agent_policies',
        'agent_kill_switch',
        'agent_catalog',
        'autopilot_capabilities',
        'plan_rango',
        '_migrations'
    ] LOOP
        IF EXISTS (SELECT 1 FROM pg_tables
                    WHERE schemaname = 'public' AND tablename = t) THEN
            -- Se retira la escritura y se DEVUELVE la lectura: la aplicacion
            -- tiene que poder consultar el catalogo para pintar la interfaz.
            EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM nelvyon_app', t);
            EXECUTE format('GRANT SELECT ON public.%I TO nelvyon_app', t);
            RAISE NOTICE '559: %  -> solo lectura para nelvyon_app', t;
        END IF;
    END LOOP;
END
$bloque_559$;
