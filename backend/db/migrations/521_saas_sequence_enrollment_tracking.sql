-- Migration 521: Sequence enrollment open/click tracking flags for branch steps
ALTER TABLE saas_sequence_enrollments
  ADD COLUMN IF NOT EXISTS email_opened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN NOT NULL DEFAULT false;
