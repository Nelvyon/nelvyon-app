-- Migración 589 · del prospecto al cliente.
--
-- LO QUE FALTABA. La máquina comercial preparaba el contacto —con base legal,
-- baja comprobada, motivo propio de esa empresa— y ahí se acababa. Si alguien
-- contestaba, no había dónde apuntarlo. La cadena que NELVYON necesita es:
--
--   descubrir → investigar → cualificar → personalizar → contactar
--     → SEGUIMIENTO → RESPUESTA → OPORTUNIDAD → CONTRATO → ALTA DEL CLIENTE
--
-- Los cinco primeros existían. Los cinco últimos no tenían dónde vivir, así que
-- una respuesta de un prospecto se perdía en el correo de alguien.
--
-- LO QUE ESTA TABLA IMPIDE, que es más importante que lo que permite:
--
--   1. QUE UNA RESPUESTA SE PIERDA. Cada preparación puede tener respuesta, y
--      la respuesta tiene fecha y sentido: interesado, no interesado, o baja.
--
--   2. QUE UN «NO» SE TRATE COMO UN «TODAVÍA NO». Una respuesta negativa cierra
--      la oportunidad y —si pidió la baja— entra en `comercial_bajas`, que es
--      de NELVYON entera. Insistir a quien dijo que no es lo que separa a una
--      agencia de un molesto.
--
--   3. QUE SE INVENTE UNA OPORTUNIDAD. Una oportunidad NECESITA una respuesta
--      real: no se puede crear sola desde una preparación que nadie contestó.
--      Sin esto, el embudo se llena de humo y las previsiones mienten.
--
--   4. QUE UN CLIENTE APAREZCA SIN CONTRATO. El paso de oportunidad a cliente
--      exige que alguien lo haya cerrado, con fecha y con quién.
--
-- NO SE ENVÍA NADA. Esta migración registra respuestas que llegan; no habilita
-- ningún envío. `enviar()` sigue lanzando siempre.

-- ── Respuestas de prospectos ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comercial_respuestas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        INTEGER NOT NULL,

    -- De qué preparación viene. Una respuesta sin contacto previo no es una
    -- respuesta: es un contacto entrante, y ése entra por otro sitio.
    preparacion_id      UUID NOT NULL REFERENCES comercial_preparaciones (id) ON DELETE CASCADE,

    sentido             TEXT NOT NULL
        CHECK (sentido IN ('interesado', 'mas_adelante', 'no_interesado', 'pide_baja')),

    -- Lo que dijo, literal. Una conversación que se resume se acaba
    -- interpretando a favor de quien la resume.
    literal             TEXT,

    -- Por dónde contestó. Se guarda para poder responder por el mismo sitio,
    -- NO para segmentar la baja: una baja vale para todos los canales.
    canal               TEXT NOT NULL,

    recibida_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrada_por      TEXT NOT NULL,

    -- Una preparación, una respuesta. Si la persona vuelve a escribir, es la
    -- conversación de la oportunidad, no otra respuesta al primer contacto.
    UNIQUE (preparacion_id)
);

CREATE INDEX IF NOT EXISTS comercial_respuestas_ws_idx
    ON comercial_respuestas (workspace_id, recibida_en DESC);

ALTER TABLE comercial_respuestas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comercial_respuestas_tenant ON comercial_respuestas;
CREATE POLICY comercial_respuestas_tenant ON comercial_respuestas
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Oportunidades ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comercial_oportunidades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        INTEGER NOT NULL,

    -- SIEMPRE cuelga de una respuesta. Es lo que impide que el embudo se llene
    -- de oportunidades que nadie ha confirmado que existan.
    respuesta_id        UUID NOT NULL REFERENCES comercial_respuestas (id) ON DELETE CASCADE,

    empresa             TEXT NOT NULL,
    dominio             TEXT NOT NULL,

    -- Qué servicios ha pedido. Vacío mientras se habla; lleno al proponer.
    servicios_de_interes JSONB NOT NULL DEFAULT '[]'::jsonb,

    estado              TEXT NOT NULL DEFAULT 'conversando'
        CHECK (estado IN ('conversando', 'propuesta_enviada', 'ganada', 'perdida')),

    -- Por qué se perdió. Obligatorio al perder: un embudo sin motivos de
    -- pérdida no enseña nada y se repiten los mismos errores.
    motivo_de_perdida   TEXT,

    -- Quién la cerró y cuándo. Sin persona no hay contrato.
    cerrada_por         TEXT,
    cerrada_en          TIMESTAMPTZ,

    -- El cliente que salió de aquí, si salió alguno.
    client_id           UUID REFERENCES os_clients (id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT comercial_oportunidades_perdida_ck CHECK (
        estado <> 'perdida' OR (motivo_de_perdida IS NOT NULL AND length(trim(motivo_de_perdida)) >= 10)
    ),
    CONSTRAINT comercial_oportunidades_ganada_ck CHECK (
        estado <> 'ganada' OR (cerrada_por IS NOT NULL AND cerrada_en IS NOT NULL AND client_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS comercial_oportunidades_ws_idx
    ON comercial_oportunidades (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comercial_oportunidades_estado_idx
    ON comercial_oportunidades (workspace_id, estado);

ALTER TABLE comercial_oportunidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comercial_oportunidades_tenant ON comercial_oportunidades;
CREATE POLICY comercial_oportunidades_tenant ON comercial_oportunidades
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.comercial_respuestas') IS NULL
       OR to_regclass('public.comercial_oportunidades') IS NULL THEN
        RAISE EXCEPTION 'migracion 589: faltan las tablas de la cadena comercial';
    END IF;

    -- La restriccion que impide el embudo de humo.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.comercial_oportunidades'::regclass
           AND contype = 'f'
           AND confrelid = 'public.comercial_respuestas'::regclass
    ) THEN
        RAISE EXCEPTION 'migracion 589: una oportunidad puede crearse sin respuesta. El embudo se llenaria de oportunidades que nadie ha confirmado.';
    END IF;

    -- Y la que impide un cliente sin contrato.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.comercial_oportunidades'::regclass
           AND conname = 'comercial_oportunidades_ganada_ck'
    ) THEN
        RAISE EXCEPTION 'migracion 589: falta la restriccion de cierre; una oportunidad podria darse por ganada sin persona ni cliente';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'comercial_oportunidades'
          AND policyname = 'comercial_oportunidades_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 589: falta el aislamiento por inquilino';
    END IF;
END
$$;
