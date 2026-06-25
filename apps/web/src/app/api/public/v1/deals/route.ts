import { NextResponse } from "next/server";
import { requirePublicApiContext } from "../../../../../lib/requirePublicApiContext";
import { getSaasDealsService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requirePublicApiContext(req, "pipeline.read");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const page  = Math.max(1, Number(url.searchParams.get("page")  ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "25")));
    const deals = await getSaasDealsService().listDeals(gate.ctx.tenantId);
    const offset = (page - 1) * limit;
    return NextResponse.json(
      { data: deals.slice(offset, offset + limit), total: deals.length, page, limit },
      { headers: gate.rateHeaders },
    );
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
