import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasVoiceCommandService,
  SaasVoiceCommandError,
  requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Parse a transcript into an intent (no persistence). */
export async function POST(req: NextRequest) {
  try {
    await requireSaasContext(req, "contacts.read");
    const body = (await req.json().catch(() => ({}))) as { transcript?: string };
    if (!body.transcript?.trim()) {
      return NextResponse.json({ error: "transcript requerido", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getSaasVoiceCommandService();
    const result = svc.parseTranscript(body.transcript);
    return NextResponse.json({ result, intent: result.intent, suggestions: result.suggestions });
  } catch (e) {
    if (e instanceof SaasVoiceCommandError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[voice/parse POST]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
