/**
 * SaasLmsService — cursos, módulos, matrículas, progreso y certificados.
 * Tables: saas_lms_courses, saas_lms_modules, saas_lms_enrollments,
 *         saas_lms_progress, saas_lms_certificates (migration 427).
 */
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
    const enroll = await this.db.query<{ id: string; status: string }>(
      `SELECT id,status FROM saas_lms_enrollments WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [enrollmentId, tenantId],
    );
    if (!enroll[0]) throw new SaasLmsError("Enrollment not found", "NOT_FOUND");

    await this.db.query(
      `UPDATE saas_lms_enrollments SET status='completed',completed_at=NOW() WHERE id=$1`,
      [enrollmentId],
    );
    const rows = await this.db.query<CertRow>(
      `INSERT INTO saas_lms_certificates (enrollment_id,tenant_id,certificate_url)
       VALUES ($1,$2,$3)
       ON CONFLICT (enrollment_id) DO UPDATE SET certificate_url=EXCLUDED.certificate_url,issued_at=NOW()
       RETURNING id,enrollment_id,tenant_id,certificate_url,issued_at`,
      [enrollmentId, tenantId, certUrl ?? null],
    );
    if (!rows[0]) throw new SaasLmsError("Failed to issue certificate", "DB_ERROR");
    return {
      id: rows[0].id, enrollmentId: rows[0].enrollment_id, tenantId: rows[0].tenant_id,
      certificateUrl: rows[0].certificate_url,
      issuedAt: new Date(rows[0].issued_at).toISOString(),
    };
  }
}

let _instance: SaasLmsService | null = null;
export function getSaasLmsService(): SaasLmsService {
  if (!_instance) _instance = new SaasLmsService();
  return _instance;
}
export function resetSaasLmsServiceForTests(): void { _instance = null; }
