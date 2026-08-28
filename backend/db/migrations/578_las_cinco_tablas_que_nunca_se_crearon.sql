-- Migración 578 · las cinco tablas que la 507 dijo haber creado y no creó.
--
-- QUÉ PASÓ, medido contra producción en solo lectura el 28 de agosto de 2026.
--
-- La migración 507 declara 123 tablas. En producción existen 118. Faltan cinco,
-- y `_migrations` dice desde hace meses que la 507 está aplicada:
--
--   campaign_recipients          → backend/services/campaign_service.py
--                                  backend/services/gdpr_service.py
--   funnel_steps                 → backend/services/funnel_builder_service.py
--   workflow_nodes               → backend/services/workflow_service.py
--   visual_workflow_executions   → backend/services/workflow_service.py
--   workflow_trigger_registry    → backend/services/workflow_service.py
--
-- Los tres servicios hacen SELECT, INSERT, UPDATE y DELETE contra ellas. Son
-- campañas, el constructor de embudos y los workflows visuales: tres cosas que
-- el producto vende y que llevan rotas en producción desde entonces.
--
-- POR QUÉ pasó, reproducido sobre una base limpia:
--
--   CREATE TABLE campaign_recipients ... REFERENCES campaigns (id)
--     → ERROR 42P01: relation "campaigns" does not exist
--
--   CREATE TABLE funnel_steps ... REFERENCES landing_pages (id)
--     → ERROR 42P01: relation "landing_pages" does not exist
--
-- `campaigns` la crea la migración 545, que corre DESPUÉS de la 507.
-- `landing_pages` la crea la propia 507, pero más abajo en el fichero.
-- Las tres de workflow dependen de `workflows`, que en su día tampoco estaba
-- en la forma esperada.
--
-- Y el aplicador de la migración consolidada toleraba el código 42P01: la
-- sentencia se saltaba en silencio, el bucle seguía, y la migración se
-- registraba como aplicada. Eso ya está corregido en
-- `backend/db/splitSqlStatements.ts`: un CREATE TABLE que falla nunca es
-- tolerable, y si alguna sentencia no se aplica la migración NO se registra.
-- Pero eso no arregla lo ya ocurrido, porque la 507 no se va a volver a
-- ejecutar. Por eso existe esta migración.
--
-- POR QUÉ ES SEGURA APLICARLA AHORA. Comprobado contra producción, solo
-- lectura: las cuatro tablas de las que dependen existen y con el tipo
-- correcto — `campaigns.id` integer, `workflows.id` integer, `funnels.id` uuid,
-- `landing_pages.id` uuid. Las cinco que faltan no existen, así que no hay nada
-- que sobrescribir: sólo se crea lo ausente.
--
-- Las definiciones son EXACTAMENTE las de la 507, sin reinterpretarlas, para
-- que la forma coincida con la que los servicios ya consultan.
--
-- VUELTA ATRÁS: `DROP TABLE` de las cinco. No hay datos que perder porque hoy
-- no existen; en cuanto se usen, sí los habrá.

-- ── campañas ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    contact_id INTEGER,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_idx
    ON campaign_recipients (campaign_id);

CREATE INDEX IF NOT EXISTS campaign_recipients_status_idx
    ON campaign_recipients (campaign_id, status);

-- ── embudos ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels (id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL DEFAULT 'Step',
    landing_page_id UUID REFERENCES landing_pages (id) ON DELETE SET NULL,
    next_step_id UUID REFERENCES funnel_steps (id) ON DELETE SET NULL,
    exit_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

-- El aislamiento va por el embudo padre: `funnel_steps` no tiene
-- `workspace_id` propio, igual que en la 507.
DROP POLICY IF EXISTS funnel_steps_tenant ON funnel_steps;
CREATE POLICY funnel_steps_tenant ON funnel_steps
    FOR ALL
    USING (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    )
    WITH CHECK (
        funnel_id IN (SELECT id FROM funnels WHERE workspace_id = current_tenant_id())
    );

-- ── workflows visuales ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_nodes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS workflow_nodes_wf_idx ON workflow_nodes (workflow_id);

CREATE TABLE IF NOT EXISTS visual_workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
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
    ON visual_workflow_executions (workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_trigger_registry (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workflow_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS workflow_trigger_registry_lookup_idx
    ON workflow_trigger_registry (workspace_id, trigger_type, is_active);

-- ── autocomprobación ────────────────────────────────────────────────────────
--
-- Una migración que dice haber creado algo y no lo creó es exactamente el
-- defecto que esta migración repara. No se va a repetir aquí: si al terminar
-- falta alguna de las cinco, esto revienta.

DO $$
DECLARE
    faltan TEXT[];
BEGIN
    SELECT array_agg(t) INTO faltan
      FROM unnest(ARRAY[
        'campaign_recipients',
        'funnel_steps',
        'workflow_nodes',
        'visual_workflow_executions',
        'workflow_trigger_registry'
      ]) AS t
     WHERE to_regclass('public.' || t) IS NULL;

    IF faltan IS NOT NULL THEN
        RAISE EXCEPTION
          'migracion 578: siguen faltando %; la migracion NO ha hecho su trabajo',
          array_to_string(faltan, ', ');
    END IF;
END
$$;
