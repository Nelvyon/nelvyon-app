-- F61 — Client websites (OS Web Builder) — Postgres + SQLite compatible

CREATE TABLE IF NOT EXISTS client_websites (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(128) NOT NULL,
    workspace_id INTEGER,
    slug VARCHAR(128) NOT NULL,
    html_content TEXT NOT NULL,
    css_content TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_websites_client ON client_websites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_websites_slug ON client_websites(slug);

CREATE TABLE IF NOT EXISTS website_sections (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    section_type VARCHAR(64) NOT NULL,
    content_json TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_sections_site ON website_sections(website_id);
