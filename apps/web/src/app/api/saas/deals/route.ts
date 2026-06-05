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

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") ?? undefined;
    const contactId = url.searchParams.get("contact_id") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const openOnly = url.searchParams.get("open_only") === "true";
    const items = await getSaasDealsService().listDeals(ctx.tenant.id, {
      stage: stage as DealStage | undefined,
      contact_id: contactId,
      search,
      open_only: openOnly,
    });
    return NextResponse.json({ deals: items, total: items.length });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.write");
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
    const deal = await getSaasDealsService().createDeal(ctx.tenant.id, {
      title: b.title,
      contact_id: typeof b.contact_id === "string" ? b.contact_id : null,
      value: typeof b.value === "number" ? b.value : undefined,
      currency: typeof b.currency === "string" ? b.currency : undefined,
      stage: typeof b.stage === "string" ? (b.stage as DealStage) : undefined,
      probability: typeof b.probability === "number" ? b.probability : undefined,
      expected_close_date:
        typeof b.expected_close_date === "string" ? b.expected_close_date : null,
      source: typeof b.source === "string" ? b.source : null,
      owner_user_id: typeof b.owner_user_id === "string" ? b.owner_user_id : null,
      notes: typeof b.notes === "string" ? b.notes : null,
    });
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
