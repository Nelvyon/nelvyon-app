import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRecurringRunLogService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ tenantId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { tenantId } = await ctx.params;
    const runs = await getOsRecurringRunLogService().listRuns({ tenantId, limit: 200 });
    return NextResponse.json({ tenantId, runs });
  } catch (e) {
    console.error("[os/recurring/[tenantId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
