import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.student_email ?? body.contact_email ?? "").trim();
    const name = body.contact_name != null ? String(body.contact_name) : null;
    if (!email) {
      return NextResponse.json({ error: "student_email required" }, { status: 400 });
    }

    const { tenantId } = await getSaasLmsService().resolveCourseTenant(courseId);
    const enrollment = await getSaasLmsService().enroll(tenantId, {
      courseId,
      contactEmail: email,
      contactName: name,
    });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
  }
}
