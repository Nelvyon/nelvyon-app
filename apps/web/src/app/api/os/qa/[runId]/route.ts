import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsVisualQaGateService } from "../../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { runId } = await ctx.params;
    const runs = await getOsVisualQaGateService().listAuditRuns({ limit: 200 });
    const run = runs.find((r) => r.id === runId);
    if (!run) return NextResponse.json({ error: "Run not found", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ run });
  } catch (e) {
    console.error("[os/qa/[runId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
