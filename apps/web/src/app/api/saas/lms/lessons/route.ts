import { NextResponse } from "next/server";
import { getSaasLmsService, SaasLmsError, saasErrorBody, saasErrorStatus, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLmsError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** POST /api/saas/lms/lessons
 * body: { module_id, title, content_type?, content?, video_url?, duration_minutes?, quiz_json? }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const moduleId = typeof b.module_id === "string" ? b.module_id : "";
    if (!moduleId) return NextResponse.json({ error: "module_id required" }, { status: 400 });
    const lesson = await getSaasLmsService().createLesson(ctx.tenant.id, moduleId, {
      title: typeof b.title === "string" ? b.title : "",
      contentType: (b.content_type as "text" | "video" | "quiz" | undefined) ?? "text",
      content: typeof b.content === "string" ? b.content : null,
      videoUrl: typeof b.video_url === "string" ? b.video_url : null,
      durationMinutes: typeof b.duration_minutes === "number" ? b.duration_minutes : null,
      quizJson: b.quiz_json && typeof b.quiz_json === "object" ? (b.quiz_json as Record<string, unknown>) : null,
    });
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
