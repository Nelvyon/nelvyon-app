-- Configuracion de Autopilot por WORKSPACE. El camino canonico nuevo.
--
-- POR QUE NO SE REUTILIZA `saas_autopilot_settings`
-- -------------------------------------------------
-- Esa tabla se indexa por `tenant_id`, y el despacho dependia de un join
-- `saas_tenants.workspace_id = nelvyon_pack_runs.workspace_id` que da CERO
-- elegibles: 20 de los 22 inquilinos tienen `workspace_id` NULL. Arreglar esos 20
-- a ciegas seria inventar relaciones que nadie puede demostrar.
--
-- El workspace, en cambio, es la unidad que ya gobierna todo lo demas: RLS decide
-- por `workspace_id`, el plan se resuelve por `workspace_id`, la pertenencia se
-- comprueba por `workspace_id`. Autopilot se cuelga de ahi y deja de depender de
-- una cadena rota.
--
-- `saas_autopilot_settings` NO se toca ni se borra: sigue sirviendo al camino
-- legacy mientras alguien lo use.
--
-- DOS TABLAS
-- ----------
-- `autopilot_workspace_settings`      el interruptor general del workspace.
-- `autopilot_workspace_capabilities`  que capacidades concretas estan encendidas.
--
-- Separadas a proposito: apagar Autopilot entero de un workspace tiene que ser
-- una sola escritura, no N. Y el planificador necesita ambas condiciones —
-- interruptor general Y capacidad concreta— para programar nada.
--
-- DEFAULTS SEGUROS
-- ----------------
-- Al nacer un workspace se le encienden SOLO las capacidades declaradas
-- `AUTOMATIC_SAFE` y reversibles. Nada que publique, envie, cobre o borre se
-- enciende solo: eso exige que el cliente lo active a conciencia.
--
-- RLS
-- ---
-- Ambas llevan `workspace_id` y politicas por pertenencia real. El cliente puede
-- ver y cambiar su propia configuracion; el planificador es un barrido
-- cross-tenant y va por `nelvyon_jobs`.

CREATE TABLE IF NOT EXISTS public.autopilot_workspace_settings (
    workspace_id       INTEGER PRIMARY KEY,
    habilitado         BOOLEAN NOT NULL DEFAULT true,
    zona_horaria       VARCHAR NOT NULL DEFAULT 'UTC',
    defaults_aplicados TIMESTAMP WITH TIME ZONE,
    creado_en          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.autopilot_workspace_capabilities (
    workspace_id  INTEGER NOT NULL,
    capacidad     VARCHAR NOT NULL REFERENCES public.autopilot_capabilities(clave),
    habilitada    BOOLEAN NOT NULL DEFAULT false,
    configurado   JSONB   NOT NULL DEFAULT '{}'::jsonb,
    activada_en   TIMESTAMP WITH TIME ZONE,
    creado_en     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_autopilot_ws_cap PRIMARY KEY (workspace_id, capacidad)
);

CREATE INDEX IF NOT EXISTS ix_autopilot_ws_cap_habilitadas
    ON public.autopilot_workspace_capabilities (capacidad)
    WHERE habilitada;

-- ─────────────────────────────────────────── orden de los planes
--
-- El planificador necesita comparar «el plan del workspace» con «el plan minimo
-- de la capacidad». Sin un orden explicito habria que codificarlo en SQL en cada
-- consulta, y ahi es donde se cuelan los errores.

CREATE TABLE IF NOT EXISTS public.plan_rango (
    plan_id VARCHAR PRIMARY KEY,
    rango   INTEGER NOT NULL
);

INSERT INTO public.plan_rango (plan_id, rango) VALUES
    ('starter', 10), ('pro', 20), ('enterprise', 30),
    ('agency', 30), ('agency_partner', 25)
ON CONFLICT (plan_id) DO NOTHING;

-- ─────────────────────────────────────────── RLS y permisos

DO $bloque_552$
DECLARE
    v_tabla text;
BEGIN
    FOREACH v_tabla IN ARRAY ARRAY['autopilot_workspace_settings',
                                   'autopilot_workspace_capabilities'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_tabla);

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                       AND tablename=v_tabla AND policyname=v_tabla||'_select') THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT USING ('
                '  workspace_id IS NOT NULL '
                '  AND public.nelvyon_user_in_workspace(workspace_id))',
                v_tabla||'_select', v_tabla);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                       AND tablename=v_tabla AND policyname=v_tabla||'_mutate') THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE USING ('
                '  workspace_id IS NOT NULL '
                '  AND public.nelvyon_workspace_can_mutate(workspace_id)) '
                'WITH CHECK (workspace_id IS NOT NULL '
                '  AND public.nelvyon_workspace_can_mutate(workspace_id))',
                v_tabla||'_mutate', v_tabla);
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_app') THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I '
                           'TO nelvyon_app', v_tabla);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_jobs') THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I '
                           'TO nelvyon_jobs', v_tabla);
        END IF;
    END LOOP;

    -- `plan_rango` es catalogo de producto: sin RLS, legible por todos.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_app') THEN
        EXECUTE 'GRANT SELECT ON public.plan_rango TO nelvyon_app';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_jobs') THEN
        EXECUTE 'GRANT SELECT ON public.plan_rango TO nelvyon_jobs';
    END IF;

    RAISE NOTICE '552: autopilot por workspace listo';
END
$bloque_552$;

COMMENT ON TABLE public.autopilot_workspace_settings IS
    'Interruptor general de Autopilot por workspace. Camino canonico: no depende '
    'del join legacy contra saas_tenants, que da cero elegibles porque 20 de 22 '
    'inquilinos tienen workspace_id NULL.';
