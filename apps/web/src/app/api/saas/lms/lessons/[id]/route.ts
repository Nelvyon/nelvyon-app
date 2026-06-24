import { NextResponse } from "next/server";
import { getSaasLmsService, SaasLmsError, saasErrorBody, saasErrorStatus, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLmsError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** PATCH /api/saas/lms/lessons/[id] */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const lesson = await getSaasLmsService().updateLesson(ctx.tenant.id, id, {
      title: typeof b.title === "string" ? b.title : undefined,
      contentType: b.content_type as "text" | "video" | "quiz" | undefined,
      content: typeof b.content === "string" ? b.content : undefined,
      videoUrl: typeof b.video_url === "string" ? b.video_url : undefined,
      durationMinutes: typeof b.duration_minutes === "number" ? b.duration_minutes : undefined,
      quizJson: b.quiz_json !== undefined ? (b.quiz_json as Record<string, unknown> | null) : undefined,
    });
    return NextResponse.json({ lesson });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/lms/lessons/[id] */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    await getSaasLmsService().deleteLesson(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
