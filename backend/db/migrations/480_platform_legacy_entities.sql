-- Legacy platform entities (Alembic SSOT) for clean Node-only migrate path.
-- Required by packOrchestrator via platformDbFallback (dbCreateClient / dbCreateCampaign).

CREATE TABLE IF NOT EXISTS nelvyon_clients (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  workspace_id INTEGER,
  business_name VARCHAR NOT NULL,
  sector VARCHAR NOT NULL,
  country VARCHAR,
  city VARCHAR,
  ideal_customer VARCHAR,
  value_proposition VARCHAR,
  differentiator VARCHAR,
  services VARCHAR,
  objectives VARCHAR,
  brand_tone VARCHAR,
  visual_style VARCHAR,
  brand_colors VARCHAR,
  logo_url VARCHAR,
  competition VARCHAR,
  testimonials VARCHAR,
  case_studies VARCHAR,
  budget VARCHAR,
  language VARCHAR,
  market VARCHAR,
  website_url VARCHAR,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  notes VARCHAR,
  status VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_clients_id ON nelvyon_clients (id);
CREATE INDEX IF NOT EXISTS ix_nelvyon_clients_workspace_id ON nelvyon_clients (workspace_id);
CREATE INDEX IF NOT EXISTS ix_nelvyon_clients_workspace_user ON nelvyon_clients (workspace_id, user_id);

CREATE TABLE IF NOT EXISTS nelvyon_campaigns (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  workspace_id INTEGER,
  project_id INTEGER NOT NULL DEFAULT 0,
  client_id INTEGER,
  platform VARCHAR NOT NULL,
  campaign_type VARCHAR NOT NULL,
  name VARCHAR,
  content VARCHAR,
  variants_count INTEGER,
  budget_suggested DOUBLE PRECISION,
  target_audience VARCHAR,
  qa_score INTEGER,
  status VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_nelvyon_campaigns_id ON nelvyon_campaigns (id);
CREATE INDEX IF NOT EXISTS ix_nelvyon_campaigns_workspace_id ON nelvyon_campaigns (workspace_id);
CREATE INDEX IF NOT EXISTS ix_nelvyon_campaigns_workspace_user ON nelvyon_campaigns (workspace_id, user_id);
