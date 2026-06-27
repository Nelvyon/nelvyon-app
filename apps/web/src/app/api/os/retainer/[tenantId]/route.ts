import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRetainerAutopilotService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ tenantId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { tenantId } = await ctx.params;
    const svc = getOsRetainerAutopilotService();
    const [cycles, portal] = await Promise.all([
      svc.listCycles({ tenantId, limit: 12 }),
      svc.getPortalRetainerView(tenantId).catch(() => null),
    ]);
    return NextResponse.json({ tenantId, cycles, current: portal });
  } catch (e) {
    console.error("[os/retainer/[tenantId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
