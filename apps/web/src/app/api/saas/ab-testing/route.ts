import { NextResponse } from "next/server";
import {
  getSaasAbTestingService,
  SaasAbTestingError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type AbTestType,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasAbTestingError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tests = await getSaasAbTestingService().list(ctx.tenant.id);
    return NextResponse.json({ tests });
  } catch (e: unknown) {
    if (e instanceof SaasAbTestingError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "declare_winner" && typeof b.id === "string") {
      const test = await getSaasAbTestingService().declareWinner(ctx.tenant.id, b.id);
      return NextResponse.json({ test });
    }

    if (b.action === "record_event" && typeof b.id === "string" && typeof b.variant_id === "string") {
      const event = b.event === "send" || b.event === "open" || b.event === "click" ? b.event : "send";
      await getSaasAbTestingService().recordEvent(ctx.tenant.id, b.id, b.variant_id, event);
      return NextResponse.json({ ok: true });
    }

    const test = await getSaasAbTestingService().create(ctx.tenant.id, {
      name: typeof b.name === "string" ? b.name : "",
      type: typeof b.type === "string" ? (b.type as AbTestType) : "subject_line",
      variants: Array.isArray(b.variants)
        ? (b.variants as Array<{ label: string; value: string }>)
        : [],
    });
    return NextResponse.json({ test }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasAbTestingError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
