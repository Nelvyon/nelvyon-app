-- Phase 1 Local Pack welcome sequence
-- Adds scheduling support for queued campaign emails.

ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS ix_email_queue_scheduled_at
  ON email_queue (status, scheduled_at);
