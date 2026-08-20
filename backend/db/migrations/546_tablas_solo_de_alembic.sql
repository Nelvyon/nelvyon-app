-- Las dos tablas que solo existian en Alembic, y que por tanto no existian.
--
-- EL FALLO QUE ESTO CORRIGE
-- -------------------------
-- El proyecto tiene DOS sistemas de migracion. El de verdad es
-- `backend/db/migrations/*.sql`, que ejecuta el servicio web en su
-- `preDeployCommand`. El otro es Alembic, con 23 revisiones, y en produccion
-- esta DESACTIVADO: `SKIP_ALEMBIC=1`. El Dockerfile lo deja escrito —se apago
-- para evitar `DuplicateTableError` sobre un esquema que ya aplica migrate.ts—
-- pero la consecuencia no estaba anotada en ninguna parte:
--
--   toda tabla definida UNICAMENTE en Alembic no existe.
--
-- Son dos, y las dos tienen codigo vivo encima:
--
--   `oauth_tokens`         routers/oauth_integrations.py hace SELECT e INSERT
--                          sobre ella en cinco sitios. Toda la funcionalidad de
--                          integraciones OAuth falla contra produccion.
--   `onboarding_progress`  las rutas legacy de onboarding la consultan y la
--                          escriben. El onboarding «moderno» usa
--                          `onboarding_workspace_steps`, que si existe; el
--                          legacy lleva roto desde siempre.
--
-- Ademas, aunque alguien reactivara Alembic no se arreglaria: el API se conecta
-- ahora como `nelvyon_app`, que NO tiene CREATE. `alembic upgrade head` fallaria,
-- y el `|| echo '[alembic] upgrade failed (non-fatal)'` del Dockerfile se tragaria
-- el error igual que hasta hoy. El esquema tiene que venir por migracion.
--
-- POR QUE LLEVAN RLS DESDE EL PRIMER DIA
-- --------------------------------------
-- La 545 dejo estas dos fuera a proposito: crear esquema nuevo era otra decision.
-- Esta es esa decision, y se toma con RLS puesto.
--
-- `oauth_tokens` guarda `access_token` y `refresh_token` de cuentas de terceros.
-- Con el API en `nelvyon_app` (sin BYPASSRLS), una tabla SIN RLS es legible por
-- cualquier inquilino: crear esta tabla sin politica seria abrir una fuga de
-- credenciales entre clientes el mismo dia de crearla.
--
-- Las politicas usan los ayudantes ya certificados: `nelvyon_user_in_workspace`
-- para leer y `nelvyon_workspace_can_mutate` para escribir. Consultan pertenencia
-- REAL contra la base, no repiten una cabecera.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- `CREATE TABLE IF NOT EXISTS` y creacion de politicas comprobada. Reaplicarla no
-- falla. No toca datos ni otras tablas.

-- ─────────────────────────────────────────────── oauth_tokens

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id             SERIAL PRIMARY KEY,
    workspace_id   INTEGER NOT NULL,
    user_id        VARCHAR NOT NULL,
    provider       VARCHAR NOT NULL,
    access_token   TEXT,
    refresh_token  TEXT,
    token_type     VARCHAR,
    expires_at     TIMESTAMP WITH TIME ZONE,
    scopes_json    TEXT,
    account_name   VARCHAR,
    account_id     VARCHAR,
    extra_json     TEXT,
    connected_at   TIMESTAMP WITH TIME ZONE,
    last_sync_at   TIMESTAMP WITH TIME ZONE,
    error          TEXT,
    CONSTRAINT uq_oauth_tokens_ws_user_provider
        UNIQUE (workspace_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS ix_oauth_tokens_workspace_id
    ON public.oauth_tokens (workspace_id);

-- ─────────────────────────────────────────────── onboarding_progress

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id            SERIAL PRIMARY KEY,
    workspace_id  INTEGER NOT NULL,
    user_id       VARCHAR NOT NULL,
    step_key      VARCHAR NOT NULL,
    completed     BOOLEAN DEFAULT false,
    completed_at  TIMESTAMP WITH TIME ZONE,
    data_json     TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_onboarding_progress_ws_user_step
        UNIQUE (workspace_id, user_id, step_key)
);

CREATE INDEX IF NOT EXISTS ix_onboarding_progress_workspace_id
    ON public.onboarding_progress (workspace_id);

-- ─────────────────────────────────────────────── RLS

DO $bloque_rls_546$
DECLARE
    v_tabla text;
BEGIN
    FOREACH v_tabla IN ARRAY ARRAY['oauth_tokens', 'onboarding_progress'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
        -- FORCE: ni siquiera el propietario de la tabla se salta la politica.
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_tabla);

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = v_tabla
              AND policyname = v_tabla || '_ws_select'
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT '
                'USING (workspace_id IS NOT NULL '
                '       AND public.nelvyon_user_in_workspace(workspace_id))',
                v_tabla || '_ws_select', v_tabla);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = v_tabla
              AND policyname = v_tabla || '_ws_insert'
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT '
                'WITH CHECK (workspace_id IS NOT NULL '
                '            AND public.nelvyon_workspace_can_mutate(workspace_id))',
                v_tabla || '_ws_insert', v_tabla);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = v_tabla
              AND policyname = v_tabla || '_ws_update'
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE '
                'USING (workspace_id IS NOT NULL '
                '       AND public.nelvyon_workspace_can_mutate(workspace_id)) '
                'WITH CHECK (workspace_id IS NOT NULL '
                '            AND public.nelvyon_workspace_can_mutate(workspace_id))',
                v_tabla || '_ws_update', v_tabla);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = v_tabla
              AND policyname = v_tabla || '_ws_delete'
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE '
                'USING (workspace_id IS NOT NULL '
                '       AND public.nelvyon_workspace_can_mutate(workspace_id))',
                v_tabla || '_ws_delete', v_tabla);
        END IF;

        -- El API necesita DML; los barridos NO tocan estas tablas y por eso
        -- `nelvyon_jobs` no recibe nada aqui.
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_app') THEN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO nelvyon_app',
                v_tabla);
            EXECUTE format(
                'GRANT USAGE, SELECT ON SEQUENCE public.%I TO nelvyon_app',
                v_tabla || '_id_seq');
        END IF;
    END LOOP;

    RAISE NOTICE '546: oauth_tokens y onboarding_progress creadas con RLS forzado';
END
$bloque_rls_546$;

COMMENT ON TABLE public.oauth_tokens IS
    'Tokens OAuth de terceros por workspace. Definida solo en Alembic, que esta '
    'desactivado en produccion (SKIP_ALEMBIC=1): existia en el codigo y no en la '
    'base. RLS forzado desde su creacion porque guarda credenciales.';

COMMENT ON TABLE public.onboarding_progress IS
    'Progreso de onboarding legacy. Misma historia que oauth_tokens: solo estaba '
    'en Alembic. El onboarding moderno usa onboarding_workspace_steps.';
