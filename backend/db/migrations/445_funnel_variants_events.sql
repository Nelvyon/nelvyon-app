-- S36: Funnel A/B variants, events log, published_at + public_slug
-- Extends migration 425 (saas_funnels + saas_funnel_steps)

-- Extend saas_funnels with publish tracking + unique public slug
ALTER TABLE saas_funnels
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_slug   TEXT;

-- Unique public slug per tenant (partial — only when set)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_funnel_public_slug
  ON saas_funnels (tenant_id, public_slug)
  WHERE public_slug IS NOT NULL;

-- A/B variant definitions per step
CREATE TABLE IF NOT EXISTS saas_funnel_step_variants (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id      UUID        NOT NULL REFERENCES saas_funnel_steps(id) ON DELETE CASCADE,
  variant_key  TEXT        NOT NULL CHECK (variant_key IN ('A','B')),
  content      JSONB       NOT NULL DEFAULT '{}',
  weight_pct   INT         NOT NULL DEFAULT 50 CHECK (weight_pct BETWEEN 0 AND 100),
  visitors     BIGINT      NOT NULL DEFAULT 0,
  conversions  BIGINT      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (step_id, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_funnel_step_variants_step ON saas_funnel_step_variants(step_id);

-- Append-only event log (visit, conversion, checkout steps)
CREATE TABLE IF NOT EXISTS saas_funnel_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id    UUID        NOT NULL REFERENCES saas_funnels(id) ON DELETE CASCADE,
  step_id      UUID        REFERENCES saas_funnel_steps(id) ON DELETE SET NULL,
  variant_key  TEXT,
  event_type   TEXT        NOT NULL CHECK (event_type IN ('visit','conversion','checkout_start','checkout_complete')),
  session_id   TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON saas_funnel_events(funnel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_step   ON saas_funnel_events(step_id, event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON saas_funnel_events(session_id) WHERE session_id IS NOT NULL;
