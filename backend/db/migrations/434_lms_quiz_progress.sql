-- S23: LMS 100% — quiz_json on lessons, denormalized progress on enrollments
ALTER TABLE saas_lms_lessons ADD COLUMN IF NOT EXISTS quiz_json JSONB;
ALTER TABLE saas_lms_enrollments ADD COLUMN IF NOT EXISTS progress_pct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE saas_lms_enrollments ADD COLUMN IF NOT EXISTS lessons_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE saas_lms_enrollments ADD COLUMN IF NOT EXISTS lessons_completed INTEGER NOT NULL DEFAULT 0;
