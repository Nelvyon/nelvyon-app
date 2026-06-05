-- Extend saas_workflows trigger_type for deal pipeline events
ALTER TABLE saas_workflows DROP CONSTRAINT IF EXISTS saas_workflows_trigger_type_check;
ALTER TABLE saas_workflows ADD CONSTRAINT saas_workflows_trigger_type_check
  CHECK (trigger_type IN (
    'contact_created',
    'contact_updated',
    'stage_changed',
    'deal_stage_changed',
    'job_completed',
    'manual',
    'scheduled'
  ));
