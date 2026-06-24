import { NextResponse } from "next/server";
import { getSaasLmsService, SaasLmsError, saasErrorBody, saasErrorStatus, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLmsError) {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/lms/modules?course_id=uuid */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const courseId = new URL(req.url).searchParams.get("course_id") ?? "";
    if (!courseId) return NextResponse.json({ error: "course_id required" }, { status: 400 });
    const modules = await getSaasLmsService().listModulesWithLessons(ctx.tenant.id, courseId);
    return NextResponse.json({ modules });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/lms/modules  body: { course_id, title, description? } */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const mod = await getSaasLmsService().createModule(
      ctx.tenant.id,
      typeof b.course_id === "string" ? b.course_id : "",
      { title: typeof b.title === "string" ? b.title : "", description: typeof b.description === "string" ? b.description : null },
    );
    return NextResponse.json({ module: mod }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
