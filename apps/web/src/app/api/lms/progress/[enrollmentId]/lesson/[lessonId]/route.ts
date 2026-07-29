import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ enrollmentId: string; lessonId: string }> },
) {
  try {
    const { enrollmentId, lessonId } = await ctx.params;
    const svc = getSaasLmsService();
    const tenantId = await svc.resolveEnrollmentTenant(enrollmentId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const courseId = typeof body.course_id === "string" ? body.course_id : "";
    const contactEmail = typeof body.contact_email === "string" ? body.contact_email : "";
    const token = typeof body.tok === "string" ? body.tok : req.headers.get("x-lms-access-token") ?? "";
    if (
      !svc.verifyLearnerAccessToken({
        courseId,
        enrollmentId,
        contactEmail,
        token,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const progress = await svc.completeLesson(tenantId, enrollmentId, lessonId);
    return NextResponse.json(progress);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Failed to update progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
