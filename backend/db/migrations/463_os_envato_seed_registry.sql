-- O15 — Envato Seed Library registry (catalog state + download status)
CREATE TABLE IF NOT EXISTS os_envato_seed_registry (
  id                TEXT PRIMARY KEY,
  sector            TEXT NOT NULL,
  source            TEXT NOT NULL DEFAULT 'synthetic'
                    CHECK (source IN ('envato','synthetic')),
  envato_id         TEXT,
  headline          TEXT NOT NULL,
  meta_title        TEXT,
  cta_label         TEXT,
  chatbot_greeting  TEXT,
  preview_url       TEXT,
  zip_path          TEXT,
  downloaded_at     TIMESTAMPTZ,
  download_status   TEXT NOT NULL DEFAULT 'metadata_only'
                    CHECK (download_status IN ('metadata_only','downloaded','failed')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_envato_seed_registry_sector
  ON os_envato_seed_registry (sector, download_status);
