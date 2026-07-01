-- Migration 483: Complete elite frentes — multichannel sequences, QA queue indexes

-- C11 multichannel sequence steps (email + SMS + WhatsApp drip)
ALTER TABLE saas_sequence_steps DROP CONSTRAINT IF EXISTS saas_sequence_steps_step_type_check;
ALTER TABLE saas_sequence_steps
  ADD CONSTRAINT saas_sequence_steps_step_type_check
  CHECK (step_type IN ('email', 'wait', 'branch', 'sms', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_os_qa_review_pack_run ON os_qa_review_queue (pack_run_id);
