export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasQuotesService,
  SaasQuotesError,
} from "@nelvyon/saas";
import type { QuoteStatus, CreateQuoteInput } from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const url = new URL(req.url);
    const dealId = url.searchParams.get("deal_id") ?? undefined;
    const status = url.searchParams.get("status") as QuoteStatus | null;
    const quotes = await getSaasQuotesService().list(ctx.tenant.id, { dealId, status: status ?? undefined });
    return NextResponse.json({ quotes });
  } catch (e: unknown) {
    if (e instanceof SaasQuotesError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.write");
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const svc = getSaasQuotesService();

    if (action === "update-status") {
      const q = await svc.updateStatus(ctx.tenant.id, String(body.id ?? ""), String(body.status) as QuoteStatus);
      return NextResponse.json({ quote: q });
    }

    if (action === "delete") {
      await svc.delete(ctx.tenant.id, String(body.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    const quote = await svc.create(ctx.tenant.id, body as unknown as CreateQuoteInput);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasQuotesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
