import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; email: string }> }) {
  try {
    const { id: courseId, email } = await ctx.params;
    const { tenantId } = await getSaasLmsService().resolveCourseTenant(courseId);
    const progress = await getSaasLmsService().getProgressByEmail(tenantId, courseId, decodeURIComponent(email));
    return NextResponse.json(progress);
  } catch (e: unknown) {
    if (e instanceof SaasLmsError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof SaasLmsError ? e.message : "Failed to load progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
