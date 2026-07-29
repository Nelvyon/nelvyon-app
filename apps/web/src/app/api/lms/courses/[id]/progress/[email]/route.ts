import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; email: string }> }) {
  try {
    const { id: courseId, email } = await ctx.params;
    const svc = getSaasLmsService();
    const { tenantId } = await svc.resolveCourseTenant(courseId);
    const decodedEmail = decodeURIComponent(email);
    const progress = await svc.getProgressByEmail(tenantId, courseId, decodedEmail);
    const token = new URL(req.url).searchParams.get("tok") ?? "";
    if (
      !svc.verifyLearnerAccessToken({
        courseId,
        enrollmentId: progress.enrollmentId,
        contactEmail: decodedEmail,
        token,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(progress);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Failed to load progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
