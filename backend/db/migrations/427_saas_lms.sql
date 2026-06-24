-- LMS: cursos, módulos, lecciones, matrículas, progreso, certificados
CREATE TABLE IF NOT EXISTS saas_lms_courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  slug           TEXT,
  cover_image    TEXT,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  modules_count  INTEGER NOT NULL DEFAULT 0,
  enrollments    INTEGER NOT NULL DEFAULT 0,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_lms_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES saas_lms_courses(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  mod_order    INTEGER NOT NULL DEFAULT 0,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_lms_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES saas_lms_modules(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text','video','quiz','file')),
  content      TEXT,
  video_url    TEXT,
  duration_minutes INTEGER,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_lms_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES saas_lms_courses(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  contact_id   TEXT,
  contact_email TEXT NOT NULL,
  contact_name  TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','refunded')),
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_lms_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES saas_lms_enrollments(id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES saas_lms_lessons(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (enrollment_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS saas_lms_certificates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID NOT NULL REFERENCES saas_lms_enrollments(id) ON DELETE CASCADE,
  tenant_id      TEXT NOT NULL,
  certificate_url TEXT,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id)
);
