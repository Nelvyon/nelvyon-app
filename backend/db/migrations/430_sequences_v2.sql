-- Migration 430: Sequences v2 — branching, wait steps, reply detection
ALTER TABLE saas_sequence_steps
  ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'email'
    CHECK (step_type IN ('email', 'wait', 'branch')),
  ADD COLUMN IF NOT EXISTS branch_condition JSONB,
  ADD COLUMN IF NOT EXISTS branch_yes_position INTEGER,
  ADD COLUMN IF NOT EXISTS branch_no_position INTEGER;

ALTER TABLE saas_sequence_enrollments
  ADD COLUMN IF NOT EXISTS reply_received BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_saas_seq_steps_type ON saas_sequence_steps(sequence_id, step_type);
