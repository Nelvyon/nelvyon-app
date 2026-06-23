import { NextResponse } from "next/server";

import {
  getSaasDealsService,
  SaasDealsError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type DealStage,
  type CreateDealInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasDealsError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") ?? undefined;
    const contact_id = url.searchParams.get("contact_id") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const open_only = url.searchParams.get("open_only") === "true";
    const include_metrics = url.searchParams.get("metrics") === "true";

    const svc = getSaasDealsService();
    const deals = await svc.listDeals(ctx.tenant.id, {
      stage: stage as DealStage | undefined,
      contact_id,
      search,
      open_only,
    });

    if (include_metrics) {
      const metrics = await svc.getMetrics(ctx.tenant.id);
      return NextResponse.json({ deals, metrics });
    }

    return NextResponse.json({ deals });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
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
    if (typeof b.title !== "string" || b.title.trim().length === 0) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const input: CreateDealInput = {
      title: b.title,
      contact_id: typeof b.contact_id === "string" ? b.contact_id : null,
      value: typeof b.value === "number" ? b.value : 0,
      currency: typeof b.currency === "string" ? b.currency : "EUR",
      stage: typeof b.stage === "string" ? (b.stage as DealStage) : "new",
      probability: typeof b.probability === "number" ? b.probability : 10,
      expected_close_date: typeof b.expected_close_date === "string" ? b.expected_close_date : null,
      source: typeof b.source === "string" ? b.source : null,
      owner_user_id: typeof b.owner_user_id === "string" ? b.owner_user_id : null,
      notes: typeof b.notes === "string" ? b.notes : null,
    };
    const svc = getSaasDealsService();
    const deal = await svc.createDeal(ctx.tenant.id, input);
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
