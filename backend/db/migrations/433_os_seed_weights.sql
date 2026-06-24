-- OS Learning Loop: sector-level CVR weights derived from GA4 conversions
CREATE TABLE IF NOT EXISTS os_seed_weights (
  sector       TEXT        PRIMARY KEY,
  cvr          FLOAT       NOT NULL DEFAULT 0,
  sessions     INTEGER     NOT NULL DEFAULT 0,
  conversions  INTEGER     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE os_seed_weights IS
  'CVR (conversion rate) per OS sector, updated monthly by the learning-loop cron. Used by seed-selector to prioritise high-performing sectors.';
