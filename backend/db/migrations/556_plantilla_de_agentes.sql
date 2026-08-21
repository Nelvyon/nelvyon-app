-- El sustrato de la plantilla de agentes de NELVYON.
--
-- LA DECISION DE ARQUITECTURA QUE ESTO REFLEJA
-- --------------------------------------------
-- NO se construye un orquestador nuevo. Ya hay uno, certificado y en produccion:
-- Autopilot. Tiene catalogo de capacidades, clasificacion de riesgo, cola con
-- idempotencia, reparto por `FOR UPDATE SKIP LOCKED`, validadores independientes,
-- evidencia obligatoria por CHECK, reintentos con backoff, escalado, aislamiento
-- por inquilino y un vigilante que lo mira.
--
-- Un agente NO es un proceso suelto que conversa con otros agentes. Un agente es
-- QUIEN EJECUTA UNA CAPACIDAD. Esa sola decision elimina de raiz los tres modos
-- de fallo tipicos de una red de agentes:
--
--   conversaciones agente<->agente sin fin  -> no hay canal directo; se emiten
--                                              trabajos, y un trabajo tiene clave
--                                              de idempotencia y profundidad
--   coste sin control                       -> el presupuesto se comprueba ANTES
--                                              de cada llamada, no despues
--   nadie sabe quien decidio que             -> cada ejecucion deja una fila que
--                                              responde las siete preguntas
--
-- LAS SIETE PREGUNTAS
-- -------------------
-- `agent_runs` existe para que cualquier resultado pueda responder:
--   quien lo decidio         -> agente, version
--   con que datos            -> entrada_hash, contexto_resumen
--   que herramienta uso      -> herramientas_usadas
--   que politica lo autorizo -> politica, modo_ejecucion
--   que evidencia produjo    -> evidencia
--   quien lo valido          -> evaluador, veredicto
--   que paso si fallo        -> estado, error, escalado_a
--
-- SIN PROVEEDOR DE MODELO NO HAY AGENTE QUE INVENTE NADA
-- ------------------------------------------------------
-- `core/ai_provider` ya resuelve el endpoint de forma fail-closed: sin
-- configuracion explicita devuelve NOT_CONFIGURED y no cae a api.openai.com. El
-- runtime respeta eso: un agente que necesite modelo y no lo tenga NO se degrada
-- a inventar; queda registrado como `sin_modelo` y escala.
--
-- ADITIVA
-- -------
-- Solo crea tablas nuevas. No toca ni una fila existente.

-- ═══════════════════════════════════════════ catalogo de agentes

CREATE TABLE IF NOT EXISTS public.agent_catalog (
    clave             VARCHAR PRIMARY KEY,
    departamento      VARCHAR NOT NULL,
    descripcion       TEXT    NOT NULL,
    -- Nivel de modelo pedido: `ninguno` para agentes deterministas, que no
    -- llaman a ningun proveedor y por tanto funcionan sin credenciales.
    nivel_modelo      VARCHAR NOT NULL DEFAULT 'ninguno',
    -- Herramientas permitidas. Lista EXPLICITA: lo que no esta, se deniega.
    herramientas      JSONB   NOT NULL DEFAULT '[]'::jsonb,
    -- Confianza minima para entregar. Por debajo, escala a una persona.
    confianza_minima  NUMERIC NOT NULL DEFAULT 0.70,
    -- Tope de coste por ejecucion, en centimos. 0 = no puede gastar.
    coste_max_centimos INTEGER NOT NULL DEFAULT 0,
    -- Profundidad maxima de encadenamiento: un agente que emite trabajo que
    -- emite trabajo... se corta aqui.
    profundidad_max   INTEGER NOT NULL DEFAULT 2,
    activo            BOOLEAN NOT NULL DEFAULT true,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_agent_nivel_modelo CHECK (
        nivel_modelo IN ('ninguno', 'rapido', 'estandar', 'profundo')),
    CONSTRAINT ck_agent_confianza CHECK (confianza_minima BETWEEN 0 AND 1),
    -- Un agente que no llama a ningun modelo no puede tener presupuesto: si lo
    -- tuviera, alguien acabaria usandolo sin darse cuenta.
    CONSTRAINT ck_agent_coste_coherente CHECK (
        nivel_modelo <> 'ninguno' OR coste_max_centimos = 0),
    CONSTRAINT ck_agent_profundidad CHECK (profundidad_max BETWEEN 0 AND 5)
);

COMMENT ON TABLE public.agent_catalog IS
    'Que agentes existen, que pueden usar y hasta donde llegan. Deny by default: '
    'una herramienta que no este en `herramientas` no se puede invocar.';

-- ═══════════════════════════════════════════ politicas

CREATE TABLE IF NOT EXISTS public.agent_policies (
    id            BIGSERIAL PRIMARY KEY,
    agente        VARCHAR NOT NULL REFERENCES public.agent_catalog(clave)
                          ON DELETE CASCADE,
    accion        VARCHAR NOT NULL,
    modo          VARCHAR NOT NULL,
    limites       JSONB   NOT NULL DEFAULT '{}'::jsonb,
    motivo        TEXT    NOT NULL,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_agent_policy_modo CHECK (modo IN (
        'AUTOMATIC_SAFE', 'AUTOMATIC_WITH_LIMITS',
        'HUMAN_APPROVAL_REQUIRED', 'DENY')),
    -- Igual que en el catalogo de Autopilot: automatico con limites exige
    -- limites. Una accion automatica sin tope es una accion sin frontera.
    CONSTRAINT ck_agent_policy_limites CHECK (
        modo <> 'AUTOMATIC_WITH_LIMITS' OR limites <> '{}'::jsonb),
    CONSTRAINT ck_agent_policy_motivo CHECK (length(trim(motivo)) > 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_policy
    ON public.agent_policies (agente, accion);

COMMENT ON TABLE public.agent_policies IS
    'Que puede hacer cada agente y bajo que condiciones. Toda entrada exige un '
    'motivo escrito: una politica sin explicacion no se puede revisar.';

-- ═══════════════════════════════════════════ auditoria: las siete preguntas

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id                BIGSERIAL PRIMARY KEY,
    workspace_id      INTEGER NOT NULL,
    agente            VARCHAR NOT NULL,
    accion            VARCHAR NOT NULL,
    job_id            BIGINT,
    profundidad       INTEGER NOT NULL DEFAULT 0,

    -- con que datos
    entrada_hash      VARCHAR NOT NULL,
    contexto_resumen  JSONB   NOT NULL DEFAULT '{}'::jsonb,

    -- que politica lo autorizo
    modo_ejecucion    VARCHAR NOT NULL,
    politica_id       BIGINT,

    -- que herramienta uso
    herramientas_usadas JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- que modelo, y cuanto costo
    modelo            VARCHAR,
    tokens_entrada    INTEGER NOT NULL DEFAULT 0,
    tokens_salida     INTEGER NOT NULL DEFAULT 0,
    coste_centimos    INTEGER NOT NULL DEFAULT 0,

    -- que produjo
    resultado         JSONB,
    confianza         NUMERIC,
    evidencia         JSONB,

    -- quien lo valido
    evaluador         VARCHAR,
    veredicto         JSONB,

    -- que paso
    estado            VARCHAR NOT NULL,
    error             TEXT,
    escalado_a        VARCHAR,

    empezado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    terminado_en      TIMESTAMPTZ,

    CONSTRAINT ck_agent_run_estado CHECK (estado IN (
        'ejecutando', 'entregado', 'rechazado_por_politica', 'sin_modelo',
        'sin_presupuesto', 'baja_confianza', 'invalido', 'fallo',
        'esperando_aprobacion', 'escalado', 'detenido_por_kill_switch')),
    -- Ni una entrega sin evidencia Y sin veredicto. Es el mismo CHECK que
    -- gobierna Autopilot, y por el mismo motivo: «no lanzo excepcion» no es
    -- prueba de nada.
    CONSTRAINT ck_agent_run_entrega CHECK (
        estado <> 'entregado' OR (evidencia IS NOT NULL AND veredicto IS NOT NULL)),
    -- Un agente no puede entregar por debajo de su umbral de confianza.
    CONSTRAINT ck_agent_run_confianza CHECK (
        estado <> 'entregado' OR confianza IS NOT NULL),
    CONSTRAINT ck_agent_run_coste CHECK (coste_centimos >= 0)
);

CREATE INDEX IF NOT EXISTS ix_agent_runs_workspace
    ON public.agent_runs (workspace_id, empezado_en DESC);
CREATE INDEX IF NOT EXISTS ix_agent_runs_agente
    ON public.agent_runs (agente, empezado_en DESC);
CREATE INDEX IF NOT EXISTS ix_agent_runs_estado
    ON public.agent_runs (estado) WHERE estado <> 'entregado';

COMMENT ON TABLE public.agent_runs IS
    'Una fila por ejecucion de agente. Responde las siete preguntas: quien '
    'decidio, con que datos, que herramienta, que politica, que evidencia, quien '
    'valido y que paso si fallo.';

-- ═══════════════════════════════════════════ presupuesto y freno de emergencia

CREATE TABLE IF NOT EXISTS public.agent_budget (
    workspace_id      INTEGER NOT NULL,
    dia               DATE    NOT NULL,
    gastado_centimos  INTEGER NOT NULL DEFAULT 0,
    tope_centimos     INTEGER NOT NULL DEFAULT 0,
    ejecuciones       INTEGER NOT NULL DEFAULT 0,
    tope_ejecuciones  INTEGER NOT NULL DEFAULT 200,
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (workspace_id, dia),
    CONSTRAINT ck_agent_budget_no_negativo CHECK (
        gastado_centimos >= 0 AND tope_centimos >= 0
        AND ejecuciones >= 0 AND tope_ejecuciones >= 0)
);

COMMENT ON TABLE public.agent_budget IS
    'Gasto y ejecuciones por workspace y dia. Se comprueba ANTES de llamar a un '
    'modelo: un presupuesto que se revisa despues no es un presupuesto.';

CREATE TABLE IF NOT EXISTS public.agent_kill_switch (
    ambito        VARCHAR PRIMARY KEY,
    detenido      BOOLEAN NOT NULL DEFAULT false,
    motivo        TEXT,
    activado_por  VARCHAR,
    activado_en   TIMESTAMPTZ
);

COMMENT ON TABLE public.agent_kill_switch IS
    'Freno de emergencia por ambito: `global`, `departamento:ventas`, '
    '`agente:sdr.calificar`. Se consulta en cada ejecucion. Detener a NELVYON '
    'tiene que ser una fila, no un despliegue.';

INSERT INTO public.agent_kill_switch (ambito, detenido)
VALUES ('global', false)
ON CONFLICT (ambito) DO NOTHING;

-- ═══════════════════════════════════════════ memoria empresarial

CREATE TABLE IF NOT EXISTS public.agent_memory (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  INTEGER NOT NULL,
    ambito        VARCHAR NOT NULL,
    clave         VARCHAR NOT NULL,
    valor         JSONB   NOT NULL,
    origen        VARCHAR NOT NULL,
    confianza     NUMERIC,
    vence_en      TIMESTAMPTZ,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_agent_memory_confianza CHECK (
        confianza IS NULL OR confianza BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_memory
    ON public.agent_memory (workspace_id, ambito, clave);
CREATE INDEX IF NOT EXISTS ix_agent_memory_vence
    ON public.agent_memory (vence_en) WHERE vence_en IS NOT NULL;

COMMENT ON TABLE public.agent_memory IS
    'Memoria por workspace. `origen` dice de donde salio cada dato: lo que un '
    'agente dedujo no puede tratarse igual que lo que dijo el cliente.';

-- ═══════════════════════════════════════════ RLS

-- Estas tablas llevan datos de inquilino, asi que RLS FORZADO desde el minuto
-- cero. `agent_catalog`, `agent_policies` y `agent_kill_switch` son de
-- plataforma —no tienen workspace— y por eso quedan fuera: las lee todo el
-- mundo y solo las escribe el operador.

ALTER TABLE public.agent_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_budget FORCE ROW LEVEL SECURITY;

DO $bloque_556_pol$
BEGIN
    -- Lectura: el inquilino ve lo suyo. Es SU auditoria; ocultarsela seria
    -- pedirle que confie sin poder comprobar.
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE tablename='agent_runs' AND policyname='agent_runs_select') THEN
        CREATE POLICY agent_runs_select ON public.agent_runs FOR SELECT
            USING (workspace_id IS NOT NULL
                   AND nelvyon_user_in_workspace(workspace_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE tablename='agent_memory' AND policyname='agent_memory_select') THEN
        CREATE POLICY agent_memory_select ON public.agent_memory FOR SELECT
            USING (workspace_id IS NOT NULL
                   AND nelvyon_user_in_workspace(workspace_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE tablename='agent_budget' AND policyname='agent_budget_select') THEN
        CREATE POLICY agent_budget_select ON public.agent_budget FOR SELECT
            USING (workspace_id IS NOT NULL
                   AND nelvyon_user_in_workspace(workspace_id));
    END IF;
    -- NO hay politica de INSERT ni de UPDATE, y es deliberado: la auditoria la
    -- escribe el motor, no el inquilino. Una auditoria que su propio sujeto
    -- puede editar no audita nada. Igual que `autopilot_jobs`.
END
$bloque_556_pol$;

-- ═══════════════════════════════════════════ privilegios minimos

DO $bloque_556_grant$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '556: no existe nelvyon_jobs; nada que otorgar';
        RETURN;
    END IF;

    -- El motor escribe la auditoria, la memoria y el presupuesto.
    GRANT SELECT, INSERT, UPDATE ON public.agent_runs   TO nelvyon_jobs;
    GRANT SELECT, INSERT, UPDATE ON public.agent_memory TO nelvyon_jobs;
    GRANT SELECT, INSERT, UPDATE ON public.agent_budget TO nelvyon_jobs;
    GRANT USAGE, SELECT ON SEQUENCE public.agent_runs_id_seq   TO nelvyon_jobs;
    GRANT USAGE, SELECT ON SEQUENCE public.agent_memory_id_seq TO nelvyon_jobs;

    -- Catalogo, politicas y freno: SOLO LECTURA. Un agente que pudiera
    -- reescribir su propia politica no tiene politica.
    GRANT SELECT ON public.agent_catalog     TO nelvyon_jobs;
    GRANT SELECT ON public.agent_policies    TO nelvyon_jobs;
    GRANT SELECT ON public.agent_kill_switch TO nelvyon_jobs;

    -- La aplicacion solo LEE la auditoria del inquilino, filtrada por RLS.
    GRANT SELECT ON public.agent_runs        TO nelvyon_app;
    GRANT SELECT ON public.agent_memory      TO nelvyon_app;
    GRANT SELECT ON public.agent_budget      TO nelvyon_app;
    GRANT SELECT ON public.agent_catalog     TO nelvyon_app;
    GRANT SELECT ON public.agent_policies    TO nelvyon_app;
END
$bloque_556_grant$;
