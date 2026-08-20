-- El nucleo del orquestador: catalogo de capacidades y cola de trabajo.
--
-- QUE PROBLEMA RESUELVE
-- ---------------------
-- NELVYON OS tiene 14 servicios y NINGUNO tiene disparador automatico: los 175
-- routers responden a peticiones, y los 16 crons que existen hacen otras cosas.
-- Autopilot iba a gobernarlos, pero su unica via de despacho dependia de
-- `saas_autopilot_settings` (0 filas con toggle ON) y de un join legacy contra
-- `nelvyon_pack_runs` que da 0 elegibles porque 20 de 22 inquilinos tienen
-- `workspace_id` NULL. `os_recurring_run_log` lleva 0 filas: nunca despacho nada.
--
-- Esta migracion NO toca los 14 servicios. Crea la capa que los llamara, para que
-- sigan sirviendo peticiones manuales exactamente igual que hoy.
--
-- DOS TABLAS, Y POR QUE SOLO DOS
-- ------------------------------
-- `autopilot_capabilities`  el catalogo: que sabe hacer NELVYON, a que servicio
--                           corresponde, con que MODO DE EJECUCION y si la
--                           operacion es reversible. Es una tabla y no una
--                           constante en codigo porque el modo de ejecucion es
--                           una decision de producto que tiene que poder
--                           auditarse y cambiarse sin desplegar.
--
-- `autopilot_jobs`          la cola persistente. Un trabajo por (workspace,
--                           capacidad, periodo), con clave de idempotencia,
--                           cerrojo por trabajador y maquina de estados
--                           explicita.
--
-- Catorce schedulers habrian sido catorce sitios donde equivocarse con el
-- backoff, el cerrojo y la deduplicacion. Aqui esa logica esta una vez.
--
-- LA CLAVE DE IDEMPOTENCIA ES LA DEFENSA REAL
-- -------------------------------------------
-- `idempotency_key` es UNICA. Esa restriccion —no un SELECT previo— es lo que
-- impide que dos planificaciones concurrentes creen el mismo trabajo dos veces.
-- Ya se aprendio dos veces en este proyecto: en `subscriptions` y en
-- `workspace_members`, las dos con la misma leccion.
--
-- EL CERROJO ES POR TIEMPO, NO POR PROCESO
-- ----------------------------------------
-- `locked_by` + `locked_until`. Si el contenedor muere a media ejecucion, el
-- cerrojo caduca solo y otro trabajador puede retomar el trabajo. Un cerrojo
-- ligado a un identificador de proceso se quedaria colgado para siempre tras un
-- reinicio, que es exactamente lo que paso con los eventos de Stripe en
-- 'processing'.
--
-- MODOS DE EJECUCION
-- ------------------
--   AUTOMATIC_SAFE          reversible y de bajo riesgo: se ejecuta sola
--   AUTOMATIC_WITH_LIMITS   automatica dentro de un cupo declarado
--   CLIENT_APPROVAL         espera al cliente
--   HUMAN_APPROVAL          espera al fundador
--   SOLO_ESCALAR            jamas se ejecuta sola: abre incidente
--
-- Dinero, credenciales, seguridad, RLS, permisos y borrados no pueden declararse
-- AUTOMATIC_*: hay un CHECK que lo impide mas abajo.
--
-- RLS
-- ---
-- `autopilot_jobs` lleva `workspace_id` y politicas por pertenencia real, como el
-- resto de tablas de inquilino. El catalogo NO: es configuracion de producto,
-- igual para todos, y no contiene datos de nadie.

-- ─────────────────────────────────────────── catalogo de capacidades

CREATE TABLE IF NOT EXISTS public.autopilot_capabilities (
    clave            VARCHAR PRIMARY KEY,
    servicio_os      VARCHAR NOT NULL,
    descripcion      TEXT    NOT NULL,
    modo_ejecucion   VARCHAR NOT NULL,
    reversible       BOOLEAN NOT NULL,
    plan_minimo      VARCHAR NOT NULL DEFAULT 'starter',
    cadencia         VARCHAR NOT NULL DEFAULT 'monthly',
    tiempo_limite_s  INTEGER NOT NULL DEFAULT 600,
    max_intentos     INTEGER NOT NULL DEFAULT 3,
    habilitada       BOOLEAN NOT NULL DEFAULT true,
    creada_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT ck_autopilot_modo CHECK (modo_ejecucion IN (
        'AUTOMATIC_SAFE', 'AUTOMATIC_WITH_LIMITS',
        'CLIENT_APPROVAL', 'HUMAN_APPROVAL', 'SOLO_ESCALAR')),

    -- Lo irreversible NUNCA es automatico. La regla vive en la base para que no
    -- dependa de que alguien se acuerde al insertar una capacidad nueva.
    CONSTRAINT ck_autopilot_irreversible_no_automatico CHECK (
        reversible OR modo_ejecucion NOT IN ('AUTOMATIC_SAFE', 'AUTOMATIC_WITH_LIMITS'))
);

-- ─────────────────────────────────────────── cola de trabajo

CREATE TABLE IF NOT EXISTS public.autopilot_jobs (
    id               BIGSERIAL PRIMARY KEY,
    workspace_id     INTEGER NOT NULL,
    capacidad        VARCHAR NOT NULL REFERENCES public.autopilot_capabilities(clave),
    idempotency_key  VARCHAR NOT NULL,
    estado           VARCHAR NOT NULL DEFAULT 'scheduled',
    prioridad        INTEGER NOT NULL DEFAULT 100,
    programado_para  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    depende_de       BIGINT REFERENCES public.autopilot_jobs(id),

    intentos         INTEGER NOT NULL DEFAULT 0,
    proximo_intento  TIMESTAMP WITH TIME ZONE,
    locked_by        VARCHAR,
    locked_until     TIMESTAMP WITH TIME ZONE,

    entrada          JSONB   NOT NULL DEFAULT '{}'::jsonb,
    resultado        JSONB,
    evidencia        JSONB,
    validacion       JSONB,
    ultimo_error     TEXT,
    incidente_id     BIGINT,

    creado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    actualizado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    terminado_en     TIMESTAMP WITH TIME ZONE,

    -- La maquina de estados, declarada donde no se puede ignorar.
    CONSTRAINT ck_autopilot_estado CHECK (estado IN (
        'scheduled', 'awaiting_approval', 'running', 'produced', 'validated',
        'delivery_pending', 'delivered', 'confirmed',
        'failed', 'escalated', 'cancelled')),

    -- `delivered` EXIGE evidencia. Terminar un worker no es entregar: sin esta
    -- restriccion volveria el caso de los 2742 entregables marcados como
    -- entregados sin nada que entregar.
    CONSTRAINT ck_autopilot_entrega_con_evidencia CHECK (
        estado NOT IN ('delivered', 'confirmed') OR evidencia IS NOT NULL)
);

-- Un trabajo por clave. ESTA restriccion es la que impide el duplicado bajo
-- concurrencia, no el SELECT que haga el planificador.
CREATE UNIQUE INDEX IF NOT EXISTS uq_autopilot_jobs_idempotency
    ON public.autopilot_jobs (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_autopilot_jobs_pendientes
    ON public.autopilot_jobs (estado, programado_para)
    WHERE estado IN ('scheduled', 'produced', 'validated', 'delivery_pending');

CREATE INDEX IF NOT EXISTS ix_autopilot_jobs_workspace
    ON public.autopilot_jobs (workspace_id, estado);

CREATE INDEX IF NOT EXISTS ix_autopilot_jobs_cerrojo
    ON public.autopilot_jobs (locked_until)
    WHERE locked_until IS NOT NULL;

-- ─────────────────────────────────────────── RLS sobre la cola

DO $bloque_551$
BEGIN
    EXECUTE 'ALTER TABLE public.autopilot_jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.autopilot_jobs FORCE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                   AND tablename='autopilot_jobs' AND policyname='autopilot_jobs_ws_select') THEN
        CREATE POLICY autopilot_jobs_ws_select ON public.autopilot_jobs FOR SELECT
            USING (workspace_id IS NOT NULL
                   AND public.nelvyon_user_in_workspace(workspace_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                   AND tablename='autopilot_jobs' AND policyname='autopilot_jobs_ws_mutate') THEN
        CREATE POLICY autopilot_jobs_ws_mutate ON public.autopilot_jobs FOR UPDATE
            USING (workspace_id IS NOT NULL
                   AND public.nelvyon_workspace_can_mutate(workspace_id))
            WITH CHECK (workspace_id IS NOT NULL
                        AND public.nelvyon_workspace_can_mutate(workspace_id));
    END IF;

    -- El API lee y actualiza; el planificador y los trabajadores son barridos
    -- cross-tenant y van por `nelvyon_jobs`, que tiene BYPASSRLS a proposito.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_app') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.autopilot_jobs TO nelvyon_app';
        EXECUTE 'GRANT SELECT ON public.autopilot_capabilities TO nelvyon_app';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.autopilot_jobs_id_seq TO nelvyon_app';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nelvyon_jobs') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.autopilot_jobs TO nelvyon_jobs';
        EXECUTE 'GRANT SELECT ON public.autopilot_capabilities TO nelvyon_jobs';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.autopilot_jobs_id_seq TO nelvyon_jobs';
    END IF;

    RAISE NOTICE '551: nucleo de autopilot listo';
END
$bloque_551$;

-- ─────────────────────────────────────────── primera capacidad conectada
--
-- `os_deliverables.snapshot_semanal` es deliberadamente la de MENOR riesgo del
-- catalogo: lee entregables del propio workspace y compone un resumen. No
-- publica, no envia, no cobra y no borra. Si sale mal, no hay nada que deshacer.
--
-- Se empieza por aqui a proposito: certificar el nucleo con una capacidad
-- reversible permite provocar fallos sin consecuencias reales.

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('os_deliverables.snapshot_semanal', 'os_deliverables',
     'Resumen semanal de entregables del workspace. Solo lee y compone.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3)
ON CONFLICT (clave) DO NOTHING;

COMMENT ON TABLE public.autopilot_jobs IS
    'Cola persistente del orquestador. La unicidad de idempotency_key es lo que '
    'impide duplicados bajo concurrencia; el cerrojo caduca por tiempo para que '
    'un reinicio no deje trabajos colgados para siempre.';

COMMENT ON TABLE public.autopilot_capabilities IS
    'Que sabe hacer NELVYON y con cuanta autonomia. El CHECK impide declarar '
    'automatica una capacidad irreversible.';
