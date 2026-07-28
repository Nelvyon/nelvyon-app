-- Migration 522: Align saas_workflows.trigger_type CHECK with API TRIGGERS
-- Adds score_threshold (accepted by SaasWorkflowService / route meta since S30).
-- Idempotent: drop + recreate constraint. Additive only — no data rewrite.
DO $$
BEGIN
  ALTER TABLE saas_workflows DROP CONSTRAINT IF EXISTS saas_workflows_trigger_type_check;
  ALTER TABLE saas_workflows ADD CONSTRAINT saas_workflows_trigger_type_check
    CHECK (trigger_type IN (
      'contact_created','contact_updated','stage_changed','deal_stage_changed',
      'job_completed','manual','scheduled','form_submitted','tag_added',
      'email_opened','email_clicked','webhook_in','date_reached',
      'sequence_enrolled','review_received','score_threshold'
    ));
EXCEPTION WHEN undefined_table THEN
  NULL; -- table may not exist yet in fresh test envs
END $$;
