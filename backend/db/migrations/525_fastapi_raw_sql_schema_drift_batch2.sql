-- 525 — Cierre completo de la deriva raw-SQL detectada por el guard.
--
-- 524 cerro dos tablas. El guard `tests/_raw_sql_schema_drift.py`, que compara
-- el SQL literal de los servicios contra el esquema efectivo (migraciones +
-- modelos SQLAlchemy), demostro que la deriva era sistemica: 44 columnas en 10
-- tablas, todas del mismo lote historico f6X, escrito antes de que existiera la
-- migracion 507.
--
-- Igual que 524: aditiva, forward-only, nullable, sin DROP, sin RENAME, sin
-- backfill. El objetivo es que el esquema soporte el codigo que YA existe, no
-- redisenar el dominio. Las columnas antiguas de 507 permanecen.
--
-- TIPOS DERIVADOS DEL COMPORTAMIENTO REAL DEL SERVICIO, no del nombre:
--   * `*_json` y `metadata` son JSONB: los servicios usan
--     `core.sql_compat.json_bind`, que emite `CAST(:x AS jsonb)` en PostgreSQL.
--   * `bounce`, `alerts_enabled`, `is_active_pool` son INTEGER: el codigo
--     escribe `1 if ... else 0`, y PostgreSQL no castea integer a boolean.
--   * importes y probabilidades son DOUBLE PRECISION: `daily_budget_eur` llega
--     como float desde el body, `publication_probability` y `spam_score` son
--     fracciones calculadas.
--   * `tier` es TEXT: `_tier(score: int) -> str`.

--
-- NOTA SOBRE `to_regclass`: no todas estas tablas las crean las migraciones.
-- `security_events` la crea un modelo SQLAlchemy via `create_all`, asi que un
-- `ALTER TABLE` desnudo revienta en una base construida solo con migraciones —
-- exactamente lo que ocurrio al certificar. El guard de existencia mantiene la
-- migracion aplicable en ambos escenarios sin silenciar errores reales: si la
-- tabla existe, las columnas se anaden; si no, este bloque no aplica y su
-- esquema lo define el modelo.

-- ── intent_scores — scoring de intencion por lead ───────────────────────────
DO $$ BEGIN
  IF to_regclass('public.intent_scores') IS NOT NULL THEN
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS lead_id TEXT;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS lead_name TEXT;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS tier TEXT;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS recommendation TEXT;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;
    ALTER TABLE intent_scores ADD COLUMN IF NOT EXISTS alerts_enabled INTEGER DEFAULT 0;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_intent_scores_workspace_lead
  ON intent_scores (workspace_id, lead_id);

-- ── pr_releases — comunicados de prensa ─────────────────────────────────────
-- `content` es el cuerpo del comunicado: 507 describe una tabla que nunca pudo
-- funcionar, no una version anterior legitima.
DO $$ BEGIN
  IF to_regclass('public.pr_releases') IS NOT NULL THEN
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS client_id TEXT;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS sector TEXT;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS media_targets_json JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS estimated_reach INTEGER;
    ALTER TABLE pr_releases ADD COLUMN IF NOT EXISTS publication_probability DOUBLE PRECISION;
  END IF;
END $$;

-- ── email_warmup_logs / accounts ────────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.email_warmup_logs') IS NOT NULL THEN
    ALTER TABLE email_warmup_logs ADD COLUMN IF NOT EXISTS recipient TEXT;
    ALTER TABLE email_warmup_logs ADD COLUMN IF NOT EXISTS spam_score DOUBLE PRECISION;
    ALTER TABLE email_warmup_logs ADD COLUMN IF NOT EXISTS bounce INTEGER DEFAULT 0;
    ALTER TABLE email_warmup_logs ADD COLUMN IF NOT EXISTS details_json JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.email_warmup_accounts') IS NOT NULL THEN
    ALTER TABLE email_warmup_accounts ADD COLUMN IF NOT EXISTS is_active_pool INTEGER DEFAULT 1;
    -- Solo aparece en SELECT (`ORDER BY ... sent_today ASC`), fuera del alcance
    -- de escrituras del guard v1. Cubrir SELECT es la ampliacion natural.
    ALTER TABLE email_warmup_accounts ADD COLUMN IF NOT EXISTS sent_today INTEGER DEFAULT 0;
  END IF;
END $$;

-- ── linkedin ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.linkedin_outreach') IS NOT NULL THEN
    ALTER TABLE linkedin_outreach ADD COLUMN IF NOT EXISTS client_id TEXT;
    ALTER TABLE linkedin_outreach ADD COLUMN IF NOT EXISTS prospect_name TEXT;
    ALTER TABLE linkedin_outreach ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE linkedin_outreach ADD COLUMN IF NOT EXISTS messages_json JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.linkedin_inbox') IS NOT NULL THEN
    ALTER TABLE linkedin_inbox ADD COLUMN IF NOT EXISTS client_id TEXT;
    ALTER TABLE linkedin_inbox ADD COLUMN IF NOT EXISTS message TEXT;
  END IF;
END $$;

-- ── ads locales (filas propias del workspace, no la cuenta corporativa) ─────
DO $$ BEGIN
  IF to_regclass('public.snapchat_ads_campaigns') IS NOT NULL THEN
    ALTER TABLE snapchat_ads_campaigns ADD COLUMN IF NOT EXISTS external_id TEXT;
    ALTER TABLE snapchat_ads_campaigns ADD COLUMN IF NOT EXISTS objective TEXT;
    ALTER TABLE snapchat_ads_campaigns ADD COLUMN IF NOT EXISTS daily_budget_eur DOUBLE PRECISION;
    ALTER TABLE snapchat_ads_campaigns ADD COLUMN IF NOT EXISTS creative_json JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.tiktok_ads_campaigns') IS NOT NULL THEN
    ALTER TABLE tiktok_ads_campaigns ADD COLUMN IF NOT EXISTS external_id TEXT;
    ALTER TABLE tiktok_ads_campaigns ADD COLUMN IF NOT EXISTS objective TEXT;
    ALTER TABLE tiktok_ads_campaigns ADD COLUMN IF NOT EXISTS daily_budget_eur DOUBLE PRECISION;
    ALTER TABLE tiktok_ads_campaigns ADD COLUMN IF NOT EXISTS creative_json JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.tiktok_dm_conversations') IS NOT NULL THEN
    ALTER TABLE tiktok_dm_conversations ADD COLUMN IF NOT EXISTS tiktok_open_id TEXT;
  END IF;
END $$;

-- ── security_events ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.security_events') IS NOT NULL THEN
    ALTER TABLE security_events ADD COLUMN IF NOT EXISTS message TEXT;
    ALTER TABLE security_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN intent_scores.tier IS
  'Categoria derivada del score. TEXT: `_tier(score: int) -> str`.';
COMMENT ON COLUMN pr_releases.content IS
  'Cuerpo del comunicado. Ausente en 507, que transcribio mal esta tabla.';
