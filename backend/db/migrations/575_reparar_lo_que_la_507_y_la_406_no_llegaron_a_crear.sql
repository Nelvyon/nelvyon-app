-- Repara los cuatro objetos que la 507 y la 406 declaran y produccion NO tiene.
--
-- POR QUE FALTAN, MEDIDO
-- ----------------------
-- Se reconstruyo una base desde cero con la MISMA semantica que el runner de
-- produccion (`db/certificacion/reconstruir_virgen.py`). Resultado: 711 objetos
-- frente a los 712 de produccion, y lo que falta se explica entero.
--
-- Lo que NO se esperaba: produccion carece de objetos que una reconstruccion
-- limpia SI crea. Es decir, **produccion es la anomala, no la cadena**.
--
-- La causa es que `migrate.ts` trata la 507 sentencia a sentencia tolerando ocho
-- codigos de error —entre ellos `42P01`, tabla inexistente— y aun asi la marca
-- como APLICADA. Sobre base virgen se tragan 94 sentencias; en produccion se
-- trago un subconjunto distinto.
--
-- Y el subconjunto de produccion tiene una explicacion concreta: `workflows` la
-- crea SQLAlchemy (`Base.metadata.create_all`) al ARRANCAR la aplicacion, pero
-- `migrate:prod` corre como `preDeployCommand`, o sea ANTES. Cuando la 507 llego
-- a su seccion de workflows, la tabla no existia todavia:
--
--     ALTER TABLE workflows ADD COLUMN edges_json      -> 42P01, tolerado
--     CREATE TABLE workflow_nodes ... REFERENCES workflows  -> 42P01, tolerado
--     CREATE TABLE visual_workflow_executions ...           -> 42P01, tolerado
--     CREATE TABLE workflow_trigger_registry ...            -> 42P01, tolerado
--
-- Comprobado replicando el caso: con `workflows` presente —como esta hoy— las
-- cuatro sentencias funcionan.
--
-- QUE DESBLOQUEA
-- --------------
-- El editor visual de workflows. Sin `edges_json` no hay donde guardar las
-- aristas del grafo: se pueden dibujar conexiones y no persisten. Y sin
-- `visual_workflow_executions` no hay historial de ejecuciones — de hecho hay
-- codigo que la actualiza y nunca pudo funcionar.
--
-- Esto NO es una decision de alcance de producto: no se inventa nada, se aplica
-- lo que la 507 ya declara.
--
-- `user_provider_api_keys` (migracion 406) es aparte y mas grave: la usan
-- `apikeys/apiKeyService.ts` y `gdpr/dataSubjectService.ts`. Sin ella, la
-- exportacion de datos de un interesado lanzaba y el borrado moria a medias.
--
-- ADITIVA. No toca ni una fila. Todo es `IF NOT EXISTS`.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.workflow_trigger_registry;
--   DROP TABLE IF EXISTS public.visual_workflow_executions;
--   DROP TABLE IF EXISTS public.workflow_nodes;
--   DROP TABLE IF EXISTS public.user_provider_api_keys;
--   ALTER TABLE public.workflows DROP COLUMN IF EXISTS edges_json;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $bloque_575$
BEGIN
    -- ── Workflows ──────────────────────────────────────────────────────────
    IF to_regclass('public.workflows') IS NULL THEN
        RAISE EXCEPTION '575: `workflows` no existe. Es la dependencia de todo '
                        'este bloque y la crea la aplicacion al arrancar; si '
                        'falta, esta migracion se estaria ejecutando antes de '
                        'que exista y repetiria el fallo que viene a reparar.';
    END IF;

    ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS edges_json JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE TABLE IF NOT EXISTS public.workflow_nodes (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        node_type TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('trigger', 'action', 'logic', 'end')),
        label TEXT NOT NULL DEFAULT '',
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
        position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (workflow_id, node_id)
    );
    CREATE INDEX IF NOT EXISTS workflow_nodes_wf_idx ON public.workflow_nodes (workflow_id);

    CREATE TABLE IF NOT EXISTS public.visual_workflow_executions (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
        workspace_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        trigger_type TEXT,
        trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'running'
            CHECK (status IN ('running', 'completed', 'failed', 'waiting')),
        steps_log JSONB NOT NULL DEFAULT '[]'::jsonb,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS visual_workflow_executions_wf_idx
        ON public.visual_workflow_executions (workflow_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS public.workflow_trigger_registry (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
        workspace_id INTEGER NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (workflow_id, trigger_type)
    );
    CREATE INDEX IF NOT EXISTS workflow_trigger_registry_lookup_idx
        ON public.workflow_trigger_registry (workspace_id, trigger_type, is_active);

    -- ── Almacen de claves de proveedor por usuario ─────────────────────────
    IF to_regclass('public.nelvyon_users') IS NULL THEN
        RAISE NOTICE '575: `nelvyon_users` no existe; se omite '
                     '`user_provider_api_keys`, que la referencia.';
    ELSE
        CREATE TABLE IF NOT EXISTS public.user_provider_api_keys (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.nelvyon_users(user_id) ON DELETE CASCADE,
            provider text NOT NULL,
            encrypted_key text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE(user_id, provider)
        );
        CREATE INDEX IF NOT EXISTS idx_user_provider_api_keys_user_id
            ON public.user_provider_api_keys(user_id);
    END IF;
END
$bloque_575$;

-- ── Aislamiento ────────────────────────────────────────────────────────────
-- Las tres tablas de workflows llevan `workspace_id` o cuelgan de `workflows`,
-- que lo tiene. Se les aplica la MISMA familia de politica que al resto del
-- espacio OS en vez de inventar una: `nelvyon_apply_os_workspace_rls` exige que
-- el workspace coincida Y que el usuario pertenezca a el.
--
-- `workflow_nodes` no tiene `workspace_id` propio —cuelga de `workflows`— asi que
-- se acota por su padre. Sin esto seria la unica de las tres sin proteger.
DO $rls_575$
BEGIN
    IF to_regclass('public.nelvyon_apply_os_workspace_rls'::text) IS NULL
       AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.proname = 'nelvyon_apply_os_workspace_rls') THEN
        RAISE NOTICE '575: falta `nelvyon_apply_os_workspace_rls`; RLS no aplicada';
        RETURN;
    END IF;

    PERFORM public.nelvyon_apply_os_workspace_rls('visual_workflow_executions');
    PERFORM public.nelvyon_apply_os_workspace_rls('workflow_trigger_registry');

    ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workflow_nodes FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS workflow_nodes_por_su_workflow ON public.workflow_nodes;
    CREATE POLICY workflow_nodes_por_su_workflow ON public.workflow_nodes
        USING (EXISTS (SELECT 1 FROM public.workflows w
                        WHERE w.id = workflow_nodes.workflow_id
                          AND public.nelvyon_os_workspace_select(w.workspace_id)))
        WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w
                             WHERE w.id = workflow_nodes.workflow_id
                               AND public.nelvyon_os_workspace_mutate(w.workspace_id)));
END
$rls_575$;
