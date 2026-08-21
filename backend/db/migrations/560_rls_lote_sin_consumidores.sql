-- RLS para las 20 tablas de inquilino que hoy no toca nadie.
--
-- POR QUE ESTE LOTE Y NO OTRO
-- ---------------------------
-- De las 111 tablas con `workspace_id` y sin RLS, estas 20 comparten tres
-- propiedades que las hacen el lote de riesgo mas bajo que existe:
--
--   estan VACIAS          proteger una tabla vacia no puede romper una consulta
--                         que hoy devuelva algo, porque hoy no devuelve nada
--   nadie las ESCRIBE     una politica de INSERT mal puesta no puede bloquear
--                         una escritura que no ocurre
--   `nelvyon_jobs` no las alcanza  ningun barrido de fondo depende de ellas
--
-- Diecinueve no las lee ni las escribe ninguna linea del backend.
-- `integration_whatsapp` la lee un fichero y no la escribe ninguno.
--
-- Esto NO es un barrido de las 111. Es el primer lote de una serie, elegido para
-- que el mecanismo quede demostrado sobre algo que no puede romperse, antes de
-- tocar las tablas que si tienen consumidores.
--
-- QUE POLITICA SE APLICA, Y POR QUE ESTA
-- ---------------------------------------
-- La estandar de OS, la misma que ya protege `os_clients`, `os_projects` y
-- `os_tasks` en produccion:
--
--   SELECT  workspace actual == el de la fila  Y  el usuario pertenece a el
--   INSERT/UPDATE/DELETE  lo anterior  Y  ademas puede mutar
--
-- No se inventa un patron nuevo: se reutiliza `nelvyon_apply_os_workspace_rls`,
-- que ya existe, es idempotente y comprueba por su cuenta que la tabla existe y
-- tiene `workspace_id`.
--
-- LO QUE ESTA POLITICA EXIGE DEL CODIGO
-- -------------------------------------
-- Que la transaccion tenga fijado el contexto de inquilino. Lo fija el gancho
-- `after_begin` en cada peticion autenticada, y los barridos de fondo usan
-- `nelvyon_jobs`, que tiene BYPASSRLS. Una ruta que consultara sin contexto
-- veria CERO FILAS SIN ERROR — por eso este lote empieza por tablas que ninguna
-- ruta consulta.
--
-- ADITIVA. No toca ni una fila.

DO $bloque_560$
DECLARE
    t text;
    tiene_filas boolean;
    aplicadas int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        -- Lote A: ni leidas ni escritas por el backend.
        'apollo_lead_cache',
        'email_queue',
        'nelvyon_pack_runs',
        'os_agent_audit_events',
        'os_brief_diff_runs',
        'os_competitor_gap_runs',
        'os_deliverable_approval_tokens',
        'os_delivery_certificates',
        'os_qa_audit_runs',
        'os_recurring_run_log',
        'os_retainer_cycles',
        'os_sector_shield_audits',
        'os_tasks_legacy_281',
        'os_truth_guard_audits',
        'pipeline_deals',
        'voice_pilot_inbound',
        'voice_pilot_usage',
        'workflow_executions',
        'workflow_rules',
        -- Lote B: leida por un fichero, escrita por ninguno.
        'integration_whatsapp'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE NOTICE '560: % no existe en este despliegue; se omite', t;
            CONTINUE;
        END IF;

        -- Fail-closed: si la tabla tuviera filas, NO se protege. Una tabla con
        -- datos pertenece a otro lote, con sus propias pruebas; protegerla aqui
        -- por descuido podria ocultar filas a quien las esta viendo hoy.
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
        IF tiene_filas THEN
            RAISE NOTICE '560: % tiene filas; pertenece a otro lote, se omite', t;
            CONTINUE;
        END IF;

        PERFORM public.nelvyon_apply_os_workspace_rls(t);
        aplicadas := aplicadas + 1;
    END LOOP;

    RAISE NOTICE '560: RLS aplicado a % tablas', aplicadas;
END
$bloque_560$;
