-- Migration 486: HubSpot sync push counter + deal tags

ALTER TABLE saas_hubspot_sync_state ADD COLUMN IF NOT EXISTS contacts_pushed INT NOT NULL DEFAULT 0;
ALTER TABLE saas_deals ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
