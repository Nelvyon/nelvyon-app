-- NELVYON GDPR — consent tracking and data deletion requests

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consent_records_workspace_contact_idx
    ON consent_records (workspace_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS consent_records_type_idx
    ON consent_records (workspace_id, consent_type);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    contact_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS data_deletion_requests_pending_idx
    ON data_deletion_requests (status, requested_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS data_deletion_requests_workspace_idx
    ON data_deletion_requests (workspace_id, requested_at DESC);
