-- Generic CRM sync state (Salesforce, Pipedrive, Zoho; HubSpot keeps legacy table)
CREATE TABLE IF NOT EXISTS saas_crm_sync_state (
  tenant_id         UUID NOT NULL,
  connector_slug    TEXT NOT NULL,
  last_sync_at      TIMESTAMPTZ,
  contacts_synced   INT NOT NULL DEFAULT 0,
  deals_synced      INT NOT NULL DEFAULT 0,
  contacts_pushed   INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'idle',
  error_message     TEXT,
  PRIMARY KEY (tenant_id, connector_slug)
);

CREATE INDEX IF NOT EXISTS idx_saas_crm_sync_state_slug ON saas_crm_sync_state (connector_slug);
