import { NextResponse } from "next/server";
import { getSaasLmsService, SaasLmsError, saasErrorBody, saasErrorStatus, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLmsError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/lms/progress?enrollment_id=uuid */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const enrollmentId = new URL(req.url).searchParams.get("enrollment_id") ?? "";
    if (!enrollmentId) return NextResponse.json({ error: "enrollment_id required" }, { status: 400 });
    const progress = await getSaasLmsService().getProgress(ctx.tenant.id, enrollmentId);
    return NextResponse.json({ progress });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/lms/progress  body: { enrollment_id, lesson_id } */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const progress = await getSaasLmsService().completeLesson(
      ctx.tenant.id,
      typeof b.enrollment_id === "string" ? b.enrollment_id : "",
      typeof b.lesson_id === "string" ? b.lesson_id : "",
    );
    return NextResponse.json({ progress });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
