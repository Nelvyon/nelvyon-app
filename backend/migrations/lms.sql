-- NELVYON LMS — courses, modules, lessons, enrollments, progress

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    thumbnail_url TEXT,
    category TEXT,
    idioma TEXT NOT NULL DEFAULT 'es',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'pending_stripe')),
    students_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_courses_workspace_idx ON lms_courses (workspace_id, status);

CREATE TABLE IF NOT EXISTS lms_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lms_modules_course_idx ON lms_modules (course_id, order_index);

CREATE TABLE IF NOT EXISTS lms_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES lms_modules (id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('video', 'text', 'pdf', 'quiz')),
    content_url TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lms_lessons_module_idx ON lms_lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS lms_lessons_course_idx ON lms_lessons (course_id);

CREATE TABLE IF NOT EXISTS lms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES lms_courses (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    student_email TEXT NOT NULL,
    student_name TEXT,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'refunded')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_enrollments_course_idx ON lms_enrollments (course_id, enrolled_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS lms_enrollments_course_email_idx
    ON lms_enrollments (course_id, lower(student_email));

CREATE TABLE IF NOT EXISTS lms_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES lms_enrollments (id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lms_lessons (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lms_progress_enrollment_idx ON lms_progress (enrollment_id);

ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lms_courses_tenant ON lms_courses;
CREATE POLICY lms_courses_tenant ON lms_courses
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_courses_public_read ON lms_courses;
CREATE POLICY lms_courses_public_read ON lms_courses
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS lms_modules_tenant ON lms_modules;
CREATE POLICY lms_modules_tenant ON lms_modules
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_modules_public_read ON lms_modules;
CREATE POLICY lms_modules_public_read ON lms_modules
    FOR SELECT USING (
        course_id IN (SELECT id FROM lms_courses WHERE status = 'published')
    );

DROP POLICY IF EXISTS lms_lessons_tenant ON lms_lessons;
CREATE POLICY lms_lessons_tenant ON lms_lessons
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_lessons_public_read ON lms_lessons;
CREATE POLICY lms_lessons_public_read ON lms_lessons
    FOR SELECT USING (
        course_id IN (SELECT id FROM lms_courses WHERE status = 'published')
    );

DROP POLICY IF EXISTS lms_enrollments_tenant ON lms_enrollments;
CREATE POLICY lms_enrollments_tenant ON lms_enrollments
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS lms_progress_tenant ON lms_progress;
CREATE POLICY lms_progress_tenant ON lms_progress
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());
