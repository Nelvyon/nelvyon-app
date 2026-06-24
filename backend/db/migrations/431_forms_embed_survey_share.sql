-- Migration 431: Forms honeypot + survey public share link
-- Adds spam protection field to forms and share capabilities to surveys

ALTER TABLE saas_forms
  ADD COLUMN IF NOT EXISTS honeypot_field TEXT NOT NULL DEFAULT '_hp';

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_slug    TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_share_slug
  ON surveys(share_slug)
  WHERE share_slug IS NOT NULL;
