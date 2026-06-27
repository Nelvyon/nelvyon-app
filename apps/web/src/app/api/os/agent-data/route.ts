import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsAgentDataService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsAgentDataService();
    const [summary, recent] = await Promise.all([svc.getSummary(), svc.listRecent(50)]);
    return NextResponse.json({
      summary,
      recent,
      integrations: { semrush: summary.semrushIntegrations, dataforseo: summary.dataforseoConfigured },
    });
  } catch (e) {
    console.error("[os/agent-data GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
