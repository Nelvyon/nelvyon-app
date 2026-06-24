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

export async function POST(req: Request, { params }: { params: { sequenceId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.contact_id !== "string") return NextResponse.json({ error: "contact_id required" }, { status: 400 });
    await getSaasSequencesService().handleReplyHook(ctx.tenant.id, params.sequenceId, b.contact_id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
