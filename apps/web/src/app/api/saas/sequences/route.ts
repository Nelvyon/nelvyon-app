import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  SaasSequencesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type SequenceTrigger,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSequencesError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const sequences = await getSaasSequencesService().list(ctx.tenant.id);
    return NextResponse.json({ sequences });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const sequence = await getSaasSequencesService().create(ctx.tenant.id, {
      name: typeof b.name === "string" ? b.name : "",
      description: typeof b.description === "string" ? b.description : null,
      triggerType: typeof b.trigger_type === "string" ? (b.trigger_type as SequenceTrigger) : "manual",
      triggerConfig: typeof b.trigger_config === "object" && b.trigger_config !== null
        ? (b.trigger_config as Record<string, unknown>) : {},
    });
    return NextResponse.json({ sequence }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSequencesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
