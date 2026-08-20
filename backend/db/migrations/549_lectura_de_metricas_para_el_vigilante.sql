-- El vigilante necesita ver a TODOS los inquilinos para poder vigilarlos.
--
-- EL FALLO QUE ESTO CORRIGE
-- -------------------------
-- `/health/business` se desplego y en produccion informo esto:
--
--     clientes_visibles: 0     (hay 1101)
--     entregables_producidos: 0 (hay 5050)
--     proyectos_activos: 0     (hay 1101)
--
-- La causa no es un error de las consultas: es que el endpoint corre como
-- `nelvyon_app` y SIN contexto de inquilino —no hay peticion autenticada detras—,
-- asi que RLS le oculta todas las filas. Correctamente, ademas: esa es la
-- garantia por la que se activo.
--
-- La consecuencia era grave y silenciosa: la vigilancia habria aprendido una
-- linea base de cero para todas las metricas de inquilino, y desde ahi no podria
-- detectar NUNCA una caida. Un detector de anomalias permanentemente ciego que
-- responde `status: ok` es peor que no tener detector, porque da por cubierto lo
-- que no vigila.
--
-- LA CORRECCION
-- -------------
-- La vigilancia es un barrido CROSS-TENANT, igual que los informes ejecutivos o
-- el planificador social: no tiene un inquilino que fijar porque los mira todos.
-- Esa via ya existe y esta certificada — `core.database.sesion_de_barrido()`,
-- ligada a `nelvyon_jobs`, que tiene BYPASSRLS a proposito desde la 540.
--
-- Lo unico que faltaba eran los GRANT de LECTURA sobre las tablas que el
-- vigilante mide. Se conceden aqui, uno a uno, siguiendo el mismo principio de
-- minimo privilegio de la 544:
--
--   * SOLO SELECT. El vigilante cuenta; no escribe en ninguna de estas tablas.
--   * Solo las tablas que aparecen en `COMPROBACIONES`. Ninguna mas.
--
-- `business_health_baseline` y `business_incidents` NO estan aqui: ahi si escribe,
-- y sus permisos se los dieron la 547 y la 548.
--
-- POR QUE NO SE RESUELVE DANDOLE CONTEXTO AL ENDPOINT
-- ---------------------------------------------------
-- Se penso y se descarto. Fijar un `app.tenant_id` cualquiera solo mediria ese
-- inquilino; recorrerlos todos obligaria a abrir una transaccion por workspace y
-- a que el endpoint supiera enumerarlos, que es justo lo que RLS le impide. El
-- rol de barrido existe para este caso.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- Solo GRANT, y solo si la tabla existe. Reaplicarla no cambia nada.

DO $bloque_549$
DECLARE
    v_tabla  text;
    v_faltan text[] := ARRAY[]::text[];
    -- Exactamente las tablas que consulta `core/salud_negocio.py`.
    v_metricas text[] := ARRAY[
        'os_clients',
        'os_projects',
        'os_deliverables',
        'stripe_webhook_events',
        'support_tickets',
        'onboarding_progress'
        -- `subscriptions` y `workspace_members` ya los concedio la 544.
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '549: sin rol nelvyon_jobs; nada que conceder';
        RETURN;
    END IF;

    FOREACH v_tabla IN ARRAY v_metricas LOOP
        IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
            v_faltan := v_faltan || v_tabla;
            CONTINUE;
        END IF;
        EXECUTE format('GRANT SELECT ON public.%I TO nelvyon_jobs', v_tabla);
    END LOOP;

    IF array_length(v_faltan, 1) IS NOT NULL THEN
        RAISE WARNING '549: tablas ausentes, sin conceder: %. El vigilante las '
                      'reportara como no medibles, que NO es lo mismo que sanas.',
                      v_faltan;
    END IF;

    RAISE NOTICE '549: lectura de metricas concedida al vigilante';
END
$bloque_549$;
