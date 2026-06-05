import { NextResponse } from "next/server";

import {
  getSaasDealsService,
  requireSaasContext,
  SaasDealsError,
  saasErrorBody,
  saasErrorStatus,
  type DealStage,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasDealsError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, context: { params: Promise<{ dealId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const { dealId } = await context.params;
    const deal = await getSaasDealsService().getDeal(ctx.tenant.id, dealId);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    return NextResponse.json({ deal });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ dealId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "deals.write");
    const { dealId } = await context.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const deal = await getSaasDealsService().updateDeal(ctx.tenant.id, dealId, {
      title: typeof b.title === "string" ? b.title : undefined,
      contact_id: typeof b.contact_id === "string" ? b.contact_id : b.contact_id === null ? null : undefined,
      value: typeof b.value === "number" ? b.value : undefined,
      currency: typeof b.currency === "string" ? b.currency : undefined,
      stage: typeof b.stage === "string" ? (b.stage as DealStage) : undefined,
      probability: typeof b.probability === "number" ? b.probability : undefined,
      expected_close_date:
        typeof b.expected_close_date === "string"
          ? b.expected_close_date
          : b.expected_close_date === null
            ? null
            : undefined,
      source: typeof b.source === "string" ? b.source : undefined,
      owner_user_id: typeof b.owner_user_id === "string" ? b.owner_user_id : undefined,
      notes: typeof b.notes === "string" ? b.notes : undefined,
    });
    return NextResponse.json({ deal });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ dealId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "deals.delete");
    const { dealId } = await context.params;
    const deals = getSaasDealsService();
    const existing = await deals.getDeal(ctx.tenant.id, dealId);
    if (!existing) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    await deals.deleteDeal(ctx.tenant.id, dealId);
    return NextResponse.json({ ok: true, id: dealId });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
