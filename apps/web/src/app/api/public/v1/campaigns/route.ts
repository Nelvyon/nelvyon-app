import { NextResponse } from "next/server";
import { requirePublicApiContext } from "../../../../../lib/requirePublicApiContext";
import { getSaasCampaniasService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requirePublicApiContext(req, "campaigns.read");
  if (!gate.ok) return gate.response;

  try {
    const campaigns = await getSaasCampaniasService().getCampanias(gate.ctx.tenantId);
    return NextResponse.json({ data: campaigns, total: campaigns.length }, { headers: gate.rateHeaders });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
