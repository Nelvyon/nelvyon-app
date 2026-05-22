-- NELVYON campaign scheduler & deliverability (Postgres)
-- Extends legacy `campaigns` (Alembic) and adds per-recipient tracking.

-- ─── campaigns (additive columns on existing table) ─────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_email TEXT;

CREATE INDEX IF NOT EXISTS campaigns_workspace_status_idx
    ON campaigns (workspace_id, status);

CREATE INDEX IF NOT EXISTS campaigns_scheduled_idx
    ON campaigns (status, scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- ─── campaign_recipients ────────────────────────────────────────────────────
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
