import { NextResponse } from "next/server";
import {
  getSaasLmsService,
  SaasLmsError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasLmsError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/lms?course_id=uuid  → enrollments for course
 *  GET /api/saas/lms                 → list courses
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");
    if (courseId) {
      const enrollments = await getSaasLmsService().listEnrollments(ctx.tenant.id, courseId);
      return NextResponse.json({ enrollments });
    }
    const courses = await getSaasLmsService().listCourses(ctx.tenant.id);
    return NextResponse.json({ courses });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/lms — create course, enroll, publish, issue cert */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "enroll") {
      const enrollment = await getSaasLmsService().enroll(ctx.tenant.id, {
        courseId: typeof b.course_id === "string" ? b.course_id : "",
        contactEmail: typeof b.contact_email === "string" ? b.contact_email : "",
        contactName: typeof b.contact_name === "string" ? b.contact_name : null,
        contactId: typeof b.contact_id === "string" ? b.contact_id : null,
      });
      return NextResponse.json({ enrollment }, { status: 201 });
    }

    if (b.action === "publish") {
      const course = await getSaasLmsService().publishCourse(ctx.tenant.id, typeof b.course_id === "string" ? b.course_id : "");
      return NextResponse.json({ course });
    }

    if (b.action === "issue_certificate") {
      const cert = await getSaasLmsService().issueCertificate(
        ctx.tenant.id,
        typeof b.enrollment_id === "string" ? b.enrollment_id : "",
        typeof b.certificate_url === "string" ? b.certificate_url : undefined,
      );
      return NextResponse.json({ certificate: cert }, { status: 201 });
    }

    // Default: create course
    const course = await getSaasLmsService().createCourse(ctx.tenant.id, {
      title: typeof b.title === "string" ? b.title : "",
      description: typeof b.description === "string" ? b.description : null,
      price: typeof b.price === "number" ? b.price : 0,
      coverImage: typeof b.cover_image === "string" ? b.cover_image : null,
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/lms?id=uuid */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    await getSaasLmsService().deleteCourse(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
