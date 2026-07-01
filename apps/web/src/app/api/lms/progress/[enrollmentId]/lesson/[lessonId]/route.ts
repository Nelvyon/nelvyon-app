import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ enrollmentId: string; lessonId: string }> },
) {
  try {
    const { enrollmentId, lessonId } = await ctx.params;
    const tenantId = await getSaasLmsService().resolveEnrollmentTenant(enrollmentId);
    const progress = await getSaasLmsService().completeLesson(tenantId, enrollmentId, lessonId);
    return NextResponse.json(progress);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Failed to update progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
