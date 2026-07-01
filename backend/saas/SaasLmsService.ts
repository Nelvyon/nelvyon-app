/**
 * SaasLmsService — cursos, módulos, lecciones, matrículas, progreso y certificados.
 * Tables: saas_lms_courses, saas_lms_modules, saas_lms_lessons,
 *         saas_lms_enrollments, saas_lms_progress, saas_lms_certificates
 *         (migrations 427 + 434).
 */
import { createHmac } from "node:crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasLmsError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasLmsError";
  }
}

export type CourseStatus = "draft" | "published" | "archived";

export type LmsCourse = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  slug: string | null;
  coverImage: string | null;
  price: number;
  status: CourseStatus;
  modulesCount: number;
  enrollments: number;
  createdAt: string;
  updatedAt: string;
};

export type LmsEnrollment = {
  id: string;
  courseId: string;
  tenantId: string;
  contactId: string | null;
  contactEmail: string;
  contactName: string | null;
  status: "active" | "completed" | "refunded";
  enrolledAt: string;
  completedAt: string | null;
};

export type LmsCertificate = {
  id: string;
  enrollmentId: string;
  tenantId: string;
  certificateUrl: string | null;
  issuedAt: string;
};

export type CreateCourseInput = {
  title: string;
  description?: string | null;
  price?: number;
  coverImage?: string | null;
};

export type EnrollInput = {
  courseId: string;
  contactEmail: string;
  contactName?: string | null;
  contactId?: string | null;
};

export type LessonContentType = "text" | "video" | "quiz";

export type LmsLesson = {
  id: string; moduleId: string; tenantId: string; title: string;
  contentType: LessonContentType; content: string | null;
  videoUrl: string | null; durationMinutes: number | null;
  lessonOrder: number; quizJson: Record<string, unknown> | null; createdAt: string;
};

export type LmsModule = {
  id: string; courseId: string; tenantId: string; title: string;
  description: string | null; modOrder: number; lessonsCount: number;
  lessons: LmsLesson[]; createdAt: string;
};

export type LmsProgressSummary = {
  enrollmentId: string; progressPct: number;
  lessonsCompleted: number; lessonsTotal: number;
};

export type CreateModuleInput = { title: string; description?: string | null };
export type UpdateModuleInput = { title?: string; description?: string | null };

export type CreateLessonInput = {
  title: string;
  contentType?: LessonContentType;
  content?: string | null;
  videoUrl?: string | null;
  durationMinutes?: number | null;
  quizJson?: Record<string, unknown> | null;
};
export type UpdateLessonInput = Partial<CreateLessonInput>;

type ModuleRow = {
  id: string; course_id: string; tenant_id: string; title: string;
  description: string | null; mod_order: number; lessons_count: number; created_at: Date;
};

type LessonRow = {
  id: string; module_id: string; tenant_id: string; title: string;
  content_type: string; content: string | null; video_url: string | null;
  duration_minutes: number | null; lesson_order: number;
  quiz_json: Record<string, unknown> | null; created_at: Date;
};

type CourseRow = {
  id: string; tenant_id: string; title: string; description: string | null;
  slug: string | null; cover_image: string | null; price: string;
  status: string; modules_count: number; enrollments: number;
  created_at: Date; updated_at: Date;
};

type EnrollRow = {
  id: string; course_id: string; tenant_id: string; contact_id: string | null;
  contact_email: string; contact_name: string | null; status: string;
  enrolled_at: Date; completed_at: Date | null; created_at: Date;
};

type CertRow = {
  id: string; enrollment_id: string; tenant_id: string;
  certificate_url: string | null; issued_at: Date;
};

function rowToLesson(r: LessonRow): LmsLesson {
  return {
    id: r.id, moduleId: r.module_id, tenantId: r.tenant_id, title: r.title,
    contentType: r.content_type as LessonContentType, content: r.content,
    videoUrl: r.video_url, durationMinutes: r.duration_minutes,
    lessonOrder: r.lesson_order, quizJson: r.quiz_json ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function rowToModule(r: ModuleRow, lessons: LmsLesson[] = []): LmsModule {
  return {
    id: r.id, courseId: r.course_id, tenantId: r.tenant_id, title: r.title,
    description: r.description, modOrder: r.mod_order, lessonsCount: r.lessons_count,
    lessons, createdAt: new Date(r.created_at).toISOString(),
  };
}

function signCertId(certId: string): string {
  const secret = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "nelvyon-cert-secret";
  return createHmac("sha256", secret).update(certId).digest("hex").slice(0, 32);
}

function rowToCourse(r: CourseRow): LmsCourse {
  return {
    id: r.id, tenantId: r.tenant_id, title: r.title, description: r.description,
    slug: r.slug, coverImage: r.cover_image, price: Number(r.price),
    status: r.status as CourseStatus, modulesCount: r.modules_count,
    enrollments: r.enrollments,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToEnrollment(r: EnrollRow): LmsEnrollment {
  return {
    id: r.id, courseId: r.course_id, tenantId: r.tenant_id, contactId: r.contact_id,
    contactEmail: r.contact_email, contactName: r.contact_name,
    status: r.status as "active" | "completed" | "refunded",
    enrolledAt: new Date(r.enrolled_at).toISOString(),
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
  };
}

export class SaasLmsService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async listCourses(tenantId: string): Promise<LmsCourse[]> {
    const rows = await this.db.query<CourseRow>(
      `SELECT id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at
       FROM saas_lms_courses WHERE tenant_id=$1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    return rows.map(rowToCourse);
  }

  async listPublishedCourses(limit = 50): Promise<LmsCourse[]> {
    const rows = await this.db.query<CourseRow>(
      `SELECT id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at
       FROM saas_lms_courses WHERE status='published' ORDER BY updated_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToCourse);
  }

  async getPublishedCourse(courseId: string): Promise<LmsCourse & { modules: LmsModule[] }> {
    const rows = await this.db.query<CourseRow>(
      `SELECT id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at
       FROM saas_lms_courses WHERE id=$1 AND status='published' LIMIT 1`,
      [courseId],
    );
    if (!rows[0]) throw new SaasLmsError("Course not found", "NOT_FOUND");
    const course = rowToCourse(rows[0]);
    const modules = await this.listModulesWithLessons(course.tenantId, course.id);
    return { ...course, modules };
  }

  async resolveCourseTenant(courseId: string): Promise<{ tenantId: string; course: LmsCourse }> {
    const rows = await this.db.query<CourseRow>(
      `SELECT id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at
       FROM saas_lms_courses WHERE id=$1 LIMIT 1`,
      [courseId],
    );
    if (!rows[0]) throw new SaasLmsError("Course not found", "NOT_FOUND");
    const course = rowToCourse(rows[0]);
    if (course.status !== "published") throw new SaasLmsError("Course is not published", "NOT_FOUND");
    return { tenantId: course.tenantId, course };
  }

  async getProgressByEmail(tenantId: string, courseId: string, email: string): Promise<LmsProgressSummary & { enrollmentId: string }> {
    const enroll = await this.db.query<{ id: string; progress_pct: number; lessons_total: number; lessons_completed: number }>(
      `SELECT id,progress_pct,lessons_total,lessons_completed
       FROM saas_lms_enrollments
       WHERE tenant_id=$1 AND course_id=$2 AND lower(contact_email)=lower($3) AND status!='refunded'
       ORDER BY enrolled_at DESC LIMIT 1`,
      [tenantId, courseId, email.trim()],
    );
    if (!enroll[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");
    return {
      enrollmentId: enroll[0].id,
      progressPct: enroll[0].progress_pct,
      lessonsCompleted: enroll[0].lessons_completed,
      lessonsTotal: enroll[0].lessons_total,
    };
  }

  async resolveEnrollmentTenant(enrollmentId: string): Promise<string> {
    const rows = await this.db.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM saas_lms_enrollments WHERE id=$1 LIMIT 1`,
      [enrollmentId],
    );
    if (!rows[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");
    return rows[0].tenant_id;
  }

  async createCourse(tenantId: string, input: CreateCourseInput): Promise<LmsCourse> {
    if (!input.title?.trim()) throw new SaasLmsError("title is required", "VALIDATION");
    const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const rows = await this.db.query<CourseRow>(
      `INSERT INTO saas_lms_courses (tenant_id,title,description,slug,price,cover_image)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at`,
      [tenantId, input.title.trim(), input.description ?? null, slug, input.price ?? 0, input.coverImage ?? null],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to create course", "DB_ERROR");
    return rowToCourse(rows[0]);
  }

  async publishCourse(tenantId: string, courseId: string): Promise<LmsCourse> {
    const rows = await this.db.query<CourseRow>(
      `UPDATE saas_lms_courses SET status='published',updated_at=NOW() WHERE tenant_id=$1 AND id=$2
       RETURNING id,tenant_id,title,description,slug,cover_image,price,status,modules_count,enrollments,created_at,updated_at`,
      [tenantId, courseId],
    );
    if (!rows[0]) throw new SaasLmsError("Course not found", "NOT_FOUND");
    return rowToCourse(rows[0]);
  }

  async deleteCourse(tenantId: string, courseId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_lms_courses WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, courseId],
    );
    if (!rows[0]) throw new SaasLmsError("Course not found", "NOT_FOUND");
  }

  async enroll(tenantId: string, input: EnrollInput): Promise<LmsEnrollment> {
    if (!input.courseId?.trim()) throw new SaasLmsError("courseId is required", "VALIDATION");
    if (!input.contactEmail?.trim()) throw new SaasLmsError("contactEmail is required", "VALIDATION");

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_lms_enrollments WHERE course_id=$1 AND tenant_id=$2 AND contact_email=$3 AND status!='refunded' LIMIT 1`,
      [input.courseId, tenantId, input.contactEmail.toLowerCase()],
    );
    if (existing[0]) throw new SaasLmsError("Already enrolled", "CONFLICT");

    // Gating: if the course has a membership_plan_id, require active membership
    try {
      const gating = await this.db.query<{ membership_plan_id: string | null }>(
        `SELECT membership_plan_id FROM saas_lms_courses WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [input.courseId, tenantId],
      );
      const planId = gating[0]?.membership_plan_id ?? null;
      if (planId) {
        const { getSaasMembershipService } = await import("./SaasMembershipService");
        const ok = await getSaasMembershipService().checkAccess(tenantId, input.contactEmail, "course", input.courseId);
        if (!ok) throw new SaasLmsError("Active membership required to enroll in this course", "MEMBERSHIP_REQUIRED");
      }
    } catch (e) {
      if (e instanceof SaasLmsError) throw e;
      // Non-fatal: column may not exist yet (pre-migration) or service unavailable
    }

    const rows = await this.db.query<EnrollRow>(
      `INSERT INTO saas_lms_enrollments (course_id,tenant_id,contact_id,contact_email,contact_name)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,course_id,tenant_id,contact_id,contact_email,contact_name,status,enrolled_at,completed_at,created_at`,
      [input.courseId, tenantId, input.contactId ?? null, input.contactEmail.toLowerCase().trim(), input.contactName ?? null],
    );
    await this.db.query(
      `UPDATE saas_lms_courses SET enrollments=enrollments+1,updated_at=NOW() WHERE id=$1`,
      [input.courseId],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to enroll", "DB_ERROR");
    return rowToEnrollment(rows[0]);
  }

  async listEnrollments(tenantId: string, courseId: string): Promise<LmsEnrollment[]> {
    const rows = await this.db.query<EnrollRow>(
      `SELECT id,course_id,tenant_id,contact_id,contact_email,contact_name,status,enrolled_at,completed_at,created_at
       FROM saas_lms_enrollments WHERE tenant_id=$1 AND course_id=$2 ORDER BY enrolled_at DESC`,
      [tenantId, courseId],
    );
    return rows.map(rowToEnrollment);
  }

  async issueCertificate(tenantId: string, enrollmentId: string, certUrl?: string): Promise<LmsCertificate> {
    const enroll = await this.db.query<{ id: string; status: string; contact_name: string | null; contact_email: string; course_id: string }>(
      `SELECT e.id,e.status,e.contact_name,e.contact_email,e.course_id
       FROM saas_lms_enrollments e WHERE e.id=$1 AND e.tenant_id=$2 LIMIT 1`,
      [enrollmentId, tenantId],
    );
    if (!enroll[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");

    await this.db.query(
      `UPDATE saas_lms_enrollments SET status='completed',completed_at=NOW() WHERE id=$1`,
      [enrollmentId],
    );

    // Generate signed certificate URL if no external URL provided
    const resolvedUrl = certUrl ?? null;
    const rows = await this.db.query<CertRow>(
      `INSERT INTO saas_lms_certificates (enrollment_id,tenant_id,certificate_url)
       VALUES ($1,$2,$3)
       ON CONFLICT (enrollment_id) DO UPDATE SET certificate_url=EXCLUDED.certificate_url,issued_at=NOW()
       RETURNING id,enrollment_id,tenant_id,certificate_url,issued_at`,
      [enrollmentId, tenantId, resolvedUrl],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to issue certificate", "DB_ERROR");

    const certId = rows[0].id;
    const tok = signCertId(certId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const signedUrl = `${appUrl}/api/saas/lms/cert/${certId}?tok=${tok}`;

    // Update certificate_url with the signed URL (if not externally provided)
    if (!certUrl) {
      await this.db.query(
        `UPDATE saas_lms_certificates SET certificate_url=$1 WHERE id=$2`,
        [signedUrl, certId],
      );
    }

    return {
      id: certId, enrollmentId: rows[0].enrollment_id, tenantId: rows[0].tenant_id,
      certificateUrl: certUrl ?? signedUrl,
      issuedAt: new Date(rows[0].issued_at).toISOString(),
    };
  }

  // ── Modules ──────────────────────────────────────────────────────────────────

  async listModulesWithLessons(tenantId: string, courseId: string): Promise<LmsModule[]> {
    const mods = await this.db.query<ModuleRow>(
      `SELECT id,course_id,tenant_id,title,description,mod_order,lessons_count,created_at
       FROM saas_lms_modules WHERE tenant_id=$1 AND course_id=$2 ORDER BY mod_order ASC`,
      [tenantId, courseId],
    );
    if (mods.length === 0) return [];

    const modIds = mods.map((m) => m.id);
    const lessons = await this.db.query<LessonRow>(
      `SELECT id,module_id,tenant_id,title,content_type,content,video_url,duration_minutes,lesson_order,quiz_json,created_at
       FROM saas_lms_lessons WHERE module_id = ANY($1) ORDER BY module_id,lesson_order ASC`,
      [modIds],
    );

    const byModule = new Map<string, LmsLesson[]>();
    for (const l of lessons) {
      const arr = byModule.get(l.module_id) ?? [];
      arr.push(rowToLesson(l));
      byModule.set(l.module_id, arr);
    }
    return mods.map((m) => rowToModule(m, byModule.get(m.id) ?? []));
  }

  async createModule(tenantId: string, courseId: string, input: CreateModuleInput): Promise<LmsModule> {
    if (!input.title?.trim()) throw new SaasLmsError("title is required", "VALIDATION");
    const course = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_lms_courses WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [courseId, tenantId],
    );
    if (!course[0]) throw new SaasLmsError("Course not found", "NOT_FOUND");

    const [orderRow] = await this.db.query<{ max: number | null }>(
      `SELECT MAX(mod_order) AS max FROM saas_lms_modules WHERE course_id=$1 AND tenant_id=$2`,
      [courseId, tenantId],
    );
    const nextOrder = (orderRow?.max ?? 0) + 1;

    const rows = await this.db.query<ModuleRow>(
      `INSERT INTO saas_lms_modules (course_id,tenant_id,title,description,mod_order)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,course_id,tenant_id,title,description,mod_order,lessons_count,created_at`,
      [courseId, tenantId, input.title.trim(), input.description ?? null, nextOrder],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to create module", "DB_ERROR");
    await this.db.query(
      `UPDATE saas_lms_courses SET modules_count=modules_count+1,updated_at=NOW() WHERE id=$1`,
      [courseId],
    );
    return rowToModule(rows[0]);
  }

  async updateModule(tenantId: string, moduleId: string, input: UpdateModuleInput): Promise<LmsModule> {
    const setParts: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (input.title !== undefined) { setParts.push(`title=$${idx++}`); vals.push(input.title.trim()); }
    if (input.description !== undefined) { setParts.push(`description=$${idx++}`); vals.push(input.description); }
    if (setParts.length === 0) throw new SaasLmsError("No fields to update", "VALIDATION");
    vals.push(moduleId, tenantId);
    const rows = await this.db.query<ModuleRow>(
      `UPDATE saas_lms_modules SET ${setParts.join(",")} WHERE id=$${idx++} AND tenant_id=$${idx}
       RETURNING id,course_id,tenant_id,title,description,mod_order,lessons_count,created_at`,
      vals,
    );
    if (!rows[0]) throw new SaasLmsError("Module not found", "NOT_FOUND");
    return rowToModule(rows[0]);
  }

  async deleteModule(tenantId: string, moduleId: string): Promise<void> {
    const mod = await this.db.query<{ id: string; course_id: string }>(
      `DELETE FROM saas_lms_modules WHERE id=$1 AND tenant_id=$2 RETURNING id,course_id`,
      [moduleId, tenantId],
    );
    if (!mod[0]) throw new SaasLmsError("Module not found", "NOT_FOUND");
    await this.db.query(
      `UPDATE saas_lms_courses SET modules_count=GREATEST(0,modules_count-1),updated_at=NOW() WHERE id=$1`,
      [mod[0].course_id],
    );
  }

  // ── Lessons ───────────────────────────────────────────────────────────────────

  async createLesson(tenantId: string, moduleId: string, input: CreateLessonInput): Promise<LmsLesson> {
    if (!input.title?.trim()) throw new SaasLmsError("title is required", "VALIDATION");
    const mod = await this.db.query<{ id: string; course_id: string }>(
      `SELECT id,course_id FROM saas_lms_modules WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [moduleId, tenantId],
    );
    if (!mod[0]) throw new SaasLmsError("Module not found", "NOT_FOUND");

    const [orderRow] = await this.db.query<{ max: number | null }>(
      `SELECT MAX(lesson_order) AS max FROM saas_lms_lessons WHERE module_id=$1 AND tenant_id=$2`,
      [moduleId, tenantId],
    );
    const nextOrder = (orderRow?.max ?? 0) + 1;
    const contentType: LessonContentType = input.contentType ?? "text";
    const rows = await this.db.query<LessonRow>(
      `INSERT INTO saas_lms_lessons (module_id,tenant_id,title,content_type,content,video_url,duration_minutes,lesson_order,quiz_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,module_id,tenant_id,title,content_type,content,video_url,duration_minutes,lesson_order,quiz_json,created_at`,
      [moduleId, tenantId, input.title.trim(), contentType,
       input.content ?? null, input.videoUrl ?? null,
       input.durationMinutes ?? null, nextOrder,
       input.quizJson ? JSON.stringify(input.quizJson) : null],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to create lesson", "DB_ERROR");
    await this.db.query(
      `UPDATE saas_lms_modules SET lessons_count=lessons_count+1 WHERE id=$1`,
      [moduleId],
    );
    return rowToLesson(rows[0]);
  }

  async updateLesson(tenantId: string, lessonId: string, input: UpdateLessonInput): Promise<LmsLesson> {
    const setParts: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (input.title !== undefined) { setParts.push(`title=$${idx++}`); vals.push(input.title.trim()); }
    if (input.contentType !== undefined) { setParts.push(`content_type=$${idx++}`); vals.push(input.contentType); }
    if (input.content !== undefined) { setParts.push(`content=$${idx++}`); vals.push(input.content); }
    if (input.videoUrl !== undefined) { setParts.push(`video_url=$${idx++}`); vals.push(input.videoUrl); }
    if (input.durationMinutes !== undefined) { setParts.push(`duration_minutes=$${idx++}`); vals.push(input.durationMinutes); }
    if (input.quizJson !== undefined) { setParts.push(`quiz_json=$${idx++}`); vals.push(input.quizJson ? JSON.stringify(input.quizJson) : null); }
    if (setParts.length === 0) throw new SaasLmsError("No fields to update", "VALIDATION");
    vals.push(lessonId, tenantId);
    const rows = await this.db.query<LessonRow>(
      `UPDATE saas_lms_lessons SET ${setParts.join(",")} WHERE id=$${idx++} AND tenant_id=$${idx}
       RETURNING id,module_id,tenant_id,title,content_type,content,video_url,duration_minutes,lesson_order,quiz_json,created_at`,
      vals,
    );
    if (!rows[0]) throw new SaasLmsError("Lesson not found", "NOT_FOUND");
    return rowToLesson(rows[0]);
  }

  async deleteLesson(tenantId: string, lessonId: string): Promise<void> {
    const lesson = await this.db.query<{ id: string; module_id: string }>(
      `DELETE FROM saas_lms_lessons WHERE id=$1 AND tenant_id=$2 RETURNING id,module_id`,
      [lessonId, tenantId],
    );
    if (!lesson[0]) throw new SaasLmsError("Lesson not found", "NOT_FOUND");
    await this.db.query(
      `UPDATE saas_lms_modules SET lessons_count=GREATEST(0,lessons_count-1) WHERE id=$1`,
      [lesson[0].module_id],
    );
  }

  // ── Progress ──────────────────────────────────────────────────────────────────

  async getProgress(tenantId: string, enrollmentId: string): Promise<LmsProgressSummary> {
    const enroll = await this.db.query<{ id: string; progress_pct: number; lessons_total: number; lessons_completed: number }>(
      `SELECT id,progress_pct,lessons_total,lessons_completed
       FROM saas_lms_enrollments WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [enrollmentId, tenantId],
    );
    if (!enroll[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");
    return {
      enrollmentId, progressPct: enroll[0].progress_pct,
      lessonsCompleted: enroll[0].lessons_completed, lessonsTotal: enroll[0].lessons_total,
    };
  }

  async completeLesson(tenantId: string, enrollmentId: string, lessonId: string): Promise<LmsProgressSummary> {
    const enroll = await this.db.query<{ id: string; course_id: string }>(
      `SELECT id,course_id FROM saas_lms_enrollments WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [enrollmentId, tenantId],
    );
    if (!enroll[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");

    // Mark lesson complete (idempotent)
    await this.db.query(
      `INSERT INTO saas_lms_progress (enrollment_id,lesson_id,tenant_id,completed,completed_at)
       VALUES ($1,$2,$3,true,NOW())
       ON CONFLICT (enrollment_id,lesson_id) DO UPDATE SET completed=true,completed_at=NOW()`,
      [enrollmentId, lessonId, tenantId],
    );

    // Recalculate progress from all lessons in the course
    const [prog] = await this.db.query<{ total: number; done: number }>(
      `SELECT
         COUNT(l.id) AS total,
         COUNT(p.lesson_id) AS done
       FROM saas_lms_lessons l
       JOIN saas_lms_modules m ON m.id = l.module_id
       LEFT JOIN saas_lms_progress p ON p.lesson_id=l.id AND p.enrollment_id=$1 AND p.completed=true
       WHERE m.course_id = $2`,
      [enrollmentId, enroll[0].course_id],
    );
    const total = Number(prog?.total ?? 0);
    const done = Number(prog?.done ?? 0);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    await this.db.query(
      `UPDATE saas_lms_enrollments SET progress_pct=$1,lessons_completed=$2,lessons_total=$3 WHERE id=$4`,
      [pct, done, total, enrollmentId],
    );

    return { enrollmentId, progressPct: pct, lessonsCompleted: done, lessonsTotal: total };
  }
}

let _instance: SaasLmsService | null = null;
export function getSaasLmsService(): SaasLmsService {
  if (!_instance) _instance = new SaasLmsService();
  return _instance;
}
export function resetSaasLmsServiceForTests(): void { _instance = null; }
