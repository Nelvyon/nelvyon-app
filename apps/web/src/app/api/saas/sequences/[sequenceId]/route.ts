import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  SaasSequencesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type SequenceStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSequencesError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, { params }: { params: { sequenceId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const sequence = await getSaasSequencesService().get(ctx.tenant.id, params.sequenceId);
    if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    const steps = await getSaasSequencesService().listSteps(ctx.tenant.id, params.sequenceId);
    return NextResponse.json({ sequence, steps });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: { sequenceId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.status === "string") {
      const seq = await getSaasSequencesService().updateStatus(ctx.tenant.id, params.sequenceId, b.status as SequenceStatus);
      return NextResponse.json({ sequence: seq });
    }
    return NextResponse.json({ error: "No supported fields to update" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, { params }: { params: { sequenceId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    await getSaasSequencesService().delete(ctx.tenant.id, params.sequenceId);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
