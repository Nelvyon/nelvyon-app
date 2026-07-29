import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ enrollmentId: string }> }) {
  try {
    const { enrollmentId } = await ctx.params;
    const svc = getSaasLmsService();
    const tenantId = await svc.resolveEnrollmentTenant(enrollmentId);
    const token = new URL(req.url).searchParams.get("tok") ?? "";
    const courseId = new URL(req.url).searchParams.get("course_id") ?? "";
    const contactEmail = new URL(req.url).searchParams.get("email") ?? "";
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
    const cert = await svc.issueCertificate(tenantId, enrollmentId);
    return NextResponse.json(cert);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Certificate unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
