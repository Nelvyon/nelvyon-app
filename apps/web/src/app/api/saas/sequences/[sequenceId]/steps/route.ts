import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  SaasSequencesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type SequenceStepType,
  type BranchCondition,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSequencesError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, { params }: { params: Promise<{ sequenceId: string }> }) {
  const { sequenceId } = await params;
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const steps = await getSaasSequencesService().listSteps(ctx.tenant.id, sequenceId);
    return NextResponse.json({ steps });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ sequenceId: string }> }) {
  const { sequenceId } = await params;
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const step = await getSaasSequencesService().addStep(ctx.tenant.id, sequenceId, {
      stepType: typeof b.step_type === "string" ? (b.step_type as SequenceStepType) : "email",
      subject: typeof b.subject === "string" ? b.subject : "",
      bodyHtml: typeof b.body_html === "string" ? b.body_html : "",
      delayDays: typeof b.delay_days === "number" ? b.delay_days : 0,
      delayHours: typeof b.delay_hours === "number" ? b.delay_hours : 0,
      position: typeof b.position === "number" ? b.position : undefined,
      branchCondition: b.branch_condition ? (b.branch_condition as BranchCondition) : null,
      branchYesPosition: typeof b.branch_yes_position === "number" ? b.branch_yes_position : null,
      branchNoPosition: typeof b.branch_no_position === "number" ? b.branch_no_position : null,
    });
    return NextResponse.json({ step }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
