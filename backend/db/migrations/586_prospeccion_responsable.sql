-- Migración 586 · la máquina comercial de NELVYON.
--
-- POR QUÉ HACE FALTA. NELVYON es una agencia: alguien la descubre, habla con
-- ella y le encarga el trabajo. Para que eso empiece, NELVYON tiene que llegar
-- a esa persona. Eso es prospección, y hasta ahora no había dónde apuntarla.
--
-- LO QUE ESTAS TABLAS IMPIDEN, que es más importante que lo que permiten:
--
--   1. QUE UNA BAJA SE PIERDA. `comercial_bajas` NO tiene `workspace_id` y no
--      tiene RLS, y las dos cosas son deliberadas: una persona que pide no
--      recibir más comunicaciones lo pide a NELVYON entera, no al espacio de
--      trabajo desde el que le escribieron. Aislar las bajas por inquilino
--      convertiría cada workspace nuevo en una segunda oportunidad para
--      molestar a quien ya dijo que no.
--
--   2. QUE SE ESCRIBA SIN MOTIVO. `por_que_esta_empresa` es NOT NULL y con
--      longitud mínima. Un contacto sin razón propia es un envío masivo, y la
--      diferencia entre prospección y spam no es el volumen: es si cada
--      mensaje tiene una razón que se pueda enseñar.
--
--   3. QUE SE INSISTA. Un índice por dominio y la cuenta de intentos. Insistir
--      a quien no contestó no es persistencia comercial.
--
--   4. QUE SE ENVÍE SIN QUE UNA PERSONA LO VEA. El estado
--      `aprobada_para_enviar` exige quién y cuándo. Y aun así, el código no
--      tiene forma de enviar: `enviar()` lanza siempre.
--
-- LO QUE NO HAY AQUÍ: ninguna tabla de envíos. No se puede registrar un envío
-- porque no se puede enviar. El día que eso cambie, será otra migración y otra
-- decisión.

-- ── Las bajas ───────────────────────────────────────────────────────────────
--
-- Sin inquilino y sin RLS, por lo dicho arriba. Es la única tabla del sistema
-- que se salta el aislamiento a propósito, y el motivo está escrito para que
-- nadie lo "arregle" sin leerlo.

CREATE TABLE IF NOT EXISTS comercial_bajas (
    dominio         TEXT PRIMARY KEY,
    -- Por qué canal lo pidió. Se guarda para poder responder, NO para filtrar:
    -- la baja vale para todos los canales.
    pedida_por      TEXT NOT NULL,
    pedida_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- El texto literal de lo que pidió, si lo hay. Una baja discutida se
    -- resuelve enseñando lo que la persona escribió, no lo que interpretamos.
    literal         TEXT
);

COMMENT ON TABLE comercial_bajas IS
  'Bajas comerciales. SIN workspace_id y SIN RLS a proposito: una baja es de NELVYON entera. Aislarla por inquilino convertiria cada workspace nuevo en una segunda oportunidad para molestar a quien dijo que no.';

-- ── Las preparaciones ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comercial_preparaciones (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          INTEGER NOT NULL,

    empresa               TEXT NOT NULL,
    -- El dominio identifica; el nombre puede repetirse.
    dominio               TEXT NOT NULL,
    sector                TEXT,

    base_legal            TEXT NOT NULL
        CHECK (base_legal IN ('interes_legitimo', 'consentimiento', 'relacion_previa')),
    -- Una base legal sin fecha no se sostiene ante nadie.
    base_legal_desde      TIMESTAMPTZ NOT NULL,

    -- LA COLUMNA QUE SEPARA ESTO DEL SPAM. Con longitud mínima, porque
    -- «me gusta vuestra web» cumpliría un NOT NULL sin decir nada.
    por_que_esta_empresa  TEXT NOT NULL CHECK (length(trim(por_que_esta_empresa)) >= 20),

    -- En qué se apoya, con fuente por afirmación. Obligatorio y no vacío: un
    -- motivo que no se puede enseñar no es un motivo.
    se_apoya_en           JSONB NOT NULL CHECK (jsonb_array_length(se_apoya_en) > 0),

    estado                TEXT NOT NULL DEFAULT 'investigando'
        CHECK (estado IN ('investigando', 'lista_para_revision', 'aprobada_para_enviar', 'descartada')),

    borrador_asunto       TEXT,
    borrador_cuerpo       TEXT,

    -- Quién dijo que sí, y cuándo. Sin persona, no hay aprobación.
    aprobada_por          TEXT,
    aprobada_en           TIMESTAMPTZ,

    creada_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creada_por            TEXT NOT NULL,

    -- Aprobar exige persona y fecha. Un estado que no significa nada es peor
    -- que no tener el estado.
    CONSTRAINT comercial_prep_aprobacion_ck CHECK (
        estado <> 'aprobada_para_enviar'
        OR (aprobada_por IS NOT NULL AND aprobada_en IS NOT NULL)
    ),

    -- Y aprobar exige que haya algo que aprobar.
    CONSTRAINT comercial_prep_borrador_ck CHECK (
        estado <> 'aprobada_para_enviar'
        OR (borrador_asunto IS NOT NULL AND borrador_cuerpo IS NOT NULL)
    )
);

-- Para la puerta 3: cuántas veces y cuándo se escribió a este dominio.
CREATE INDEX IF NOT EXISTS comercial_preparaciones_dominio_idx
    ON comercial_preparaciones (lower(dominio), creada_en DESC);

-- El índice por inquilino que RLS va a exigir (ver migración 585).
CREATE INDEX IF NOT EXISTS comercial_preparaciones_ws_idx
    ON comercial_preparaciones (workspace_id, creada_en DESC);

ALTER TABLE comercial_preparaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comercial_preparaciones_tenant ON comercial_preparaciones;
CREATE POLICY comercial_preparaciones_tenant ON comercial_preparaciones
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.comercial_bajas') IS NULL
       OR to_regclass('public.comercial_preparaciones') IS NULL THEN
        RAISE EXCEPTION 'migracion 586: faltan las tablas comerciales';
    END IF;

    -- La baja NO debe tener RLS. Si alguien se la pone "por coherencia", cada
    -- workspace dejaria de ver las bajas de los demas y volveria a escribir a
    -- quien ya dijo que no.
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'comercial_bajas' AND c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'migracion 586: comercial_bajas tiene RLS. Una baja es de NELVYON entera; aislarla por inquilino da una segunda oportunidad de molestar a quien dijo que no.';
    END IF;

    -- Las preparaciones SI.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE tablename = 'comercial_preparaciones' AND policyname = 'comercial_preparaciones_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 586: falta el aislamiento por inquilino de las preparaciones';
    END IF;

    -- Y la restriccion que impide el envio masivo disfrazado.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.comercial_preparaciones'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%por_que_esta_empresa%'
    ) THEN
        RAISE EXCEPTION 'migracion 586: falta la restriccion de motivo propio; sin ella una preparacion sin razon pasa por buena';
    END IF;
END
$$;
