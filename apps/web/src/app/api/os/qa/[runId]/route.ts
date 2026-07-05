import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsVisualQaGateService } from "../../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const { runId } = await ctx.params;
    const run = await getOsVisualQaGateService().getAuditRunById(runId, workspaceId);
    if (!run) return notFoundResponse();
    return NextResponse.json({ run });
  } catch (e) {
    console.error("[os/qa/[runId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
