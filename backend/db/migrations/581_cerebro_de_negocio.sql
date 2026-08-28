-- Migración 581 · el cerebro de negocio de cada cliente.
--
-- QUÉ HAY HOY, medido sobre el esquema:
--
--   `os_clients` tiene 23 campos con contexto de cliente —sector, ideal_customer,
--   value_proposition, competition, objectives, brand_tone...— y los 23 son
--   `text`. `ideal_customer` es un párrafo. `competition` es un párrafo.
--   `services` es un párrafo.
--
--   Y ningún agente sectorial lo lee: `grep os_clients backend/os-agents/sectors/`
--   no devuelve nada. Los 1.994 agentes reciben un `brief` armado en la ruta, no
--   contexto del cliente.
--
-- Eso es un formulario guardado, no un cerebro. Un párrafo no se puede consultar
-- por dimensión, no se puede versionar por campo, no se puede saber de dónde
-- salió cada dato ni con qué confianza, y obliga a meterlo entero en el prompt
-- —que es justo usar el prompt como sustituto de la arquitectura.
--
-- QUÉ AÑADE ESTA MIGRACIÓN
--
--   `os_client_brain`         una fila por cliente y dimensión, con valor
--                             estructurado, procedencia, confianza y versión.
--   `os_client_brain_history` el histórico, porque un cerebro que se sobrescribe
--                             no permite explicar por qué se decidió algo.
--
-- Por qué UNA FILA POR DIMENSIÓN y no una columna por dimensión: las dimensiones
-- crecen (hoy 26, mañana otra), cada una tiene su propia procedencia y su propia
-- frescura, y una tabla ancha obligaría a una migración por cada dimensión nueva
-- y no podría decir «esto lo dijo el cliente en el intake, y esto lo dedujo un
-- agente el martes con confianza 0,6».
--
-- NO se toca `os_clients`. El cerebro LEE de ahí y complementa; no compite.

CREATE TABLE IF NOT EXISTS os_client_brain (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id    INTEGER NOT NULL,
    client_id       TEXT NOT NULL,

    -- La dimensión: 'sector', 'icp', 'competidores', 'brand_voice'... El
    -- catálogo vive en el código (`cerebroDeNegocio.ts`) y no en un CHECK,
    -- porque añadir una dimensión no debe exigir una migración.
    dimension       TEXT NOT NULL,

    -- El valor, SIEMPRE estructurado. Un texto suelto se guarda como
    -- {"texto": "..."}, de modo que quien lo lee no tiene que adivinar la forma.
    valor           JSONB NOT NULL,

    -- DE DÓNDE SALIÓ. Es lo que permite que la Fase 17 responda «este insight
    -- de dónde vino» y que nadie confunda lo que dijo el cliente con lo que
    -- dedujo un agente.
    procedencia     TEXT NOT NULL
        CHECK (procedencia IN (
            'cliente_intake',      -- lo escribió el cliente en el formulario
            'cliente_portal',      -- lo editó el cliente después
            'nelvyon_humano',      -- lo puso alguien del equipo
            'agente_deducido',     -- lo dedujo un agente
            'medido',              -- salió de datos reales (analytics, CRM, ads)
            'importado'            -- vino de una integración
        )),

    -- Quién exactamente. Un id de agente, un correo, un nombre de integración.
    origen          TEXT NOT NULL,

    -- Cuánta confianza merece. 1.0 para lo que dijo el cliente; menos para lo
    -- deducido. Un agente que lee el cerebro puede decidir preguntar en vez de
    -- asumir.
    confianza       NUMERIC(3,2) NOT NULL DEFAULT 1.00
        CHECK (confianza >= 0 AND confianza <= 1),

    -- Cuándo deja de ser de fiar. Un ICP de hace dos años no es un ICP.
    -- NULL = no caduca (el sector de una empresa no caduca; su presupuesto sí).
    vigente_hasta   TIMESTAMPTZ,

    -- Versión de ESTA dimensión, no del cerebro entero: cambiar el presupuesto
    -- no debe invalidar la marca.
    version         INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Una dimensión, un valor vigente, por cliente. El histórico va aparte.
    CONSTRAINT os_client_brain_uq UNIQUE (workspace_id, client_id, dimension)
);

CREATE INDEX IF NOT EXISTS os_client_brain_cliente_idx
    ON os_client_brain (workspace_id, client_id);

-- Para poder preguntar «qué clientes tienen el ICP caducado» sin recorrer todo.
CREATE INDEX IF NOT EXISTS os_client_brain_vigencia_idx
    ON os_client_brain (vigente_hasta)
    WHERE vigente_hasta IS NOT NULL;

ALTER TABLE os_client_brain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_client_brain_tenant ON os_client_brain;
CREATE POLICY os_client_brain_tenant ON os_client_brain
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── El histórico ────────────────────────────────────────────────────────────
--
-- Un cerebro que se sobrescribe no permite explicar por qué se decidió algo el
-- mes pasado. Y sin eso, la optimización continua de la Fase 16 no puede
-- distinguir «el resultado cambió porque cambiamos la acción» de «cambió porque
-- el cliente cambió su propuesta de valor y nadie se enteró».

CREATE TABLE IF NOT EXISTS os_client_brain_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    INTEGER NOT NULL,
    client_id       TEXT NOT NULL,
    dimension       TEXT NOT NULL,
    valor           JSONB NOT NULL,
    procedencia     TEXT NOT NULL,
    origen          TEXT NOT NULL,
    confianza       NUMERIC(3,2) NOT NULL,
    version         INTEGER NOT NULL,
    -- Por qué dejó de ser el valor vigente.
    reemplazado_por TEXT,
    valido_desde    TIMESTAMPTZ NOT NULL,
    valido_hasta    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_client_brain_history_idx
    ON os_client_brain_history (workspace_id, client_id, dimension, valido_hasta DESC);

ALTER TABLE os_client_brain_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_client_brain_history_tenant ON os_client_brain_history;
CREATE POLICY os_client_brain_history_tenant ON os_client_brain_history
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.os_client_brain') IS NULL
       OR to_regclass('public.os_client_brain_history') IS NULL THEN
        RAISE EXCEPTION 'migracion 581: no se crearon las tablas del cerebro';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'os_client_brain_uq'
    ) THEN
        RAISE EXCEPTION 'migracion 581: falta el UNIQUE por dimension; sin el, un cliente tendria dos ICP distintos vigentes a la vez';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE tablename = 'os_client_brain' AND policyname = 'os_client_brain_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 581: falta el aislamiento por inquilino del cerebro';
    END IF;
END
$$;
