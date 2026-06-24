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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const { id } = await params;
    const svc = getSaasQuotesService();
    const quote = await svc.get(ctx.tenant.id, id);
    const html = svc.renderQuotePdfHtml(quote, ctx.tenant.companyName ?? "Nelvyon");
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e: unknown) {
    if (e instanceof SaasQuotesError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
