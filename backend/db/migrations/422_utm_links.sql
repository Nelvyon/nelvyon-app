-- 422 — UTM link builder + click tracking
CREATE TABLE IF NOT EXISTS saas_utm_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  utm_source      TEXT NOT NULL,
  utm_medium      TEXT NOT NULL,
  utm_campaign    TEXT NOT NULL,
  utm_term        TEXT,
  utm_content     TEXT,
  short_code      TEXT NOT NULL UNIQUE,
  clicks          BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utm_links_tenant ON saas_utm_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_utm_links_short_code ON saas_utm_links(short_code);
CREATE INDEX IF NOT EXISTS idx_utm_links_campaign ON saas_utm_links(tenant_id, utm_campaign);

CREATE TABLE IF NOT EXISTS saas_utm_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_link_id     UUID NOT NULL REFERENCES saas_utm_links(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  ip              TEXT,
  user_agent      TEXT,
  referer         TEXT,
  clicked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utm_clicks_link ON saas_utm_clicks(utm_link_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_utm_clicks_tenant ON saas_utm_clicks(tenant_id, clicked_at);
