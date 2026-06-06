-- OS-1-01: clientes canónicos NELVYON OS (sin backfill; nelvyon_clients sigue legacy)

CREATE TABLE IF NOT EXISTS os_clients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            INTEGER NOT NULL,
  created_by_user_id      TEXT NOT NULL,
  business_name           TEXT NOT NULL,
  sector                  TEXT,
  country                 TEXT,
  city                    TEXT,
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'archived')),
  contact_email           TEXT,
  contact_name            TEXT,
  website_url             TEXT,
  ideal_customer          TEXT,
  value_proposition       TEXT,
  differentiator          TEXT,
  services                TEXT,
  objectives              TEXT,
  brand_tone              TEXT,
  visual_style            TEXT,
  brand_colors            TEXT,
  logo_url                TEXT,
  competition             TEXT,
  testimonials            TEXT,
  case_studies            TEXT,
  budget                  TEXT,
  language                TEXT,
  market                  TEXT,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_nelvyon_client_id INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_os_clients_legacy_nelvyon
  ON os_clients (legacy_nelvyon_client_id)
  WHERE legacy_nelvyon_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_os_clients_workspace
  ON os_clients (workspace_id);

CREATE INDEX IF NOT EXISTS idx_os_clients_workspace_status
  ON os_clients (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_os_clients_workspace_business_name
  ON os_clients (workspace_id, lower(business_name));

COMMENT ON TABLE os_clients IS
  'Clientes NELVYON OS (OS-1). Fuente oficial PM; nelvyon_clients permanece legacy hasta backfill OS-1-02.';

COMMENT ON COLUMN os_clients.legacy_nelvyon_client_id IS
  'Mapa 1:1 con nelvyon_clients.id para migración; NULL en clientes creados nativos en os_clients.';
