-- GBP reviews sync table
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_time TIMESTAMPTZ,
  reply_text TEXT,
  reply_time TIMESTAMPTZ,
  reply_status TEXT NOT NULL DEFAULT 'pending', -- pending|replied|ignored
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, google_review_id)
);

CREATE INDEX IF NOT EXISTS idx_gbp_reviews_tenant ON gbp_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_rating ON gbp_reviews(tenant_id, rating);

-- Extend workflow trigger_type CHECK to include review_received
-- Drop existing constraint (name may vary) and recreate with new value
DO $$
BEGIN
  ALTER TABLE saas_workflows DROP CONSTRAINT IF EXISTS saas_workflows_trigger_type_check;
  ALTER TABLE saas_workflows ADD CONSTRAINT saas_workflows_trigger_type_check
    CHECK (trigger_type IN (
      'contact_created','contact_updated','stage_changed','deal_stage_changed',
      'job_completed','manual','scheduled','form_submitted','tag_added',
      'email_opened','email_clicked','webhook_in','date_reached',
      'sequence_enrolled','review_received'
    ));
EXCEPTION WHEN others THEN
  NULL; -- table may not exist yet in test envs
END $$;
