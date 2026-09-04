import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  SaasSequencesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ sequenceId: string }> }) {
  const { sequenceId } = await params;
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.contact_id !== "string") return NextResponse.json({ error: "contact_id required" }, { status: 400 });
    // El TEXTO es lo que decide si esto detiene la secuencia o no. Sin él, un
    // «estare fuera hasta el lunes» se trata como una respuesta humana y el
    // prospecto no vuelve a saber de nosotros.
    const texto = [b.subject, b.text, b.body]
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .trim();
    const clase = await getSaasSequencesService().handleReplyHook(
      ctx.tenant.id,
      sequenceId,
      b.contact_id,
      texto || null,
    );
    return NextResponse.json({ ok: true, clasificacion: clase });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
