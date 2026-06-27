import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  getSaasWorkflowService,
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
    const enrollment = await getSaasSequencesService().enroll(ctx.tenant.id, sequenceId, b.contact_id);
    void getSaasWorkflowService().dispatchActiveWorkflows(ctx.tenant.id, "sequence_enrolled", {
      sequenceId, contactId: b.contact_id,
    }).catch(() => undefined);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
