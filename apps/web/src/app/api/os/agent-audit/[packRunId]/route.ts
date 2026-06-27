import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsAgentAuditTrailService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ packRunId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { packRunId } = await ctx.params;
    const trails = await getOsAgentAuditTrailService().getTrailForPackRun(packRunId);
    return NextResponse.json({ packRunId, trails });
  } catch (e) {
    console.error("[os/agent-audit/[packRunId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
