import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasVoiceCommandService,
  SaasVoiceCommandError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Parse + log a command and return navigation/action instructions for the client. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = (ctx as { user?: { id: string } }).user?.id ?? null;
    const body = (await req.json().catch(() => ({}))) as { transcript?: string; source?: "web_speech" | "media_upload" };
    if (!body.transcript?.trim()) {
      return NextResponse.json({ error: "transcript requerido", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getSaasVoiceCommandService();
    const result = await svc.executeCommand(ctx.tenant.id, body.transcript, { userId, source: body.source });
    return NextResponse.json({
      success: result.success,
      route: result.route ?? null,
      intent: result.intent,
      message: result.message,
      suggestions: result.suggestions,
    });
  } catch (e) {
    if (e instanceof SaasVoiceCommandError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[voice/execute POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
