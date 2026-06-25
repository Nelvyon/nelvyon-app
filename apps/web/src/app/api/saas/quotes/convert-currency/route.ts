import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const quoteId = searchParams.get("quoteId");
    const currency = searchParams.get("currency");
    if (!quoteId || !currency) return NextResponse.json({ error: "quoteId and currency required" }, { status: 400 });
    const result = await getSaasCpqEnterpriseService().convertQuoteCurrency(ctx.tenant.id, quoteId, currency);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
