-- RLS para las 9 tablas cuyos escritores son SIEMPRE rutas autenticadas.
--
-- POR QUE ESTAS NUEVE Y NO LAS OTRAS 76
-- --------------------------------------
-- Activar RLS rompe una escritura cuando quien escribe no tiene fijado el
-- contexto de inquilino. De las 85 tablas vacias con escrituras, se clasificaron
-- sus escritores por la via de entrada:
--
--   9  todos sus escritores son rutas que exigen usuario autenticado. El gancho
--      `after_begin` fija el contexto en cada transaccion, asi que la politica
--      lo dejara pasar. Estas son.
--
--   26 se escriben desde WEBHOOKS y rutas publicas. Ahi no hay usuario, y por
--      tanto no hay contexto: la politica las bloquearia. No se tocan aqui —
--      necesitan que el manejador fije el inquilino explicitamente, que es
--      trabajo aparte y una decision de diseño.
--
--   50 se escriben desde servicios cuyo contexto depende de quien los llame.
--      Hay que leerlas una a una; no se adivinan.
--
-- Este lote es la parte que se puede cerrar HOY con la certeza de no romper
-- nada, y por eso se cierra hoy.
--
-- NO SON TABLAS SIN IMPORTANCIA
-- -----------------------------
-- `deals`, `contracts`, `conversations`, `appointments` y `revenue_records`
-- guardan oportunidades, contratos, conversaciones, citas e ingresos de cada
-- cliente. Que estuvieran sin RLS significaba que una consulta que se olvidara
-- del `WHERE workspace_id` devolvia la cartera comercial de todos los
-- inquilinos a la vez.
--
-- ADITIVA. No toca ni una fila.

DO $bloque_562$
DECLARE
    t text;
    tiene_filas boolean;
    aplicadas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'activities',
        'advisor_session_usage',
        'appointments',
        'contracts',
        'conversations',
        'deals',
        'revenue_records',
        'tenant_branding_activation_logs',
        'tenant_module_permissions'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE NOTICE '562: % no existe en este despliegue; se omite', t;
            CONTINUE;
        END IF;

        -- Fail-closed, igual que en la 560: una tabla con filas pertenece a otro
        -- lote. Protegerla aqui por descuido podria ocultar datos a quien hoy
        -- los esta viendo, y eso se lee como «se han borrado».
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            RAISE NOTICE '562: % tiene filas; pertenece a otro lote, se omite', t;
            CONTINUE;
        END IF;

        PERFORM public.nelvyon_apply_os_workspace_rls(t);
        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '562: RLS aplicado a % tablas', aplicadas;
END
$bloque_562$;
