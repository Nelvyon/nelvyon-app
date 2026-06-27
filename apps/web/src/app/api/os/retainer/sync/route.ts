import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRetainerAutopilotService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { tenantId?, periodKey? } — manual resync (single tenant or all eligible). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { tenantId?: string; periodKey?: string };
    const svc = getOsRetainerAutopilotService();
    if (body.tenantId) {
      const cycle = await svc.syncCycle(body.tenantId, body.periodKey);
      return NextResponse.json({ cycle });
    }
    const result = await svc.syncAllEligibleTenants(body.periodKey);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[os/retainer/sync POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
