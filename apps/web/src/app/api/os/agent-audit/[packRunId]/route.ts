import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, packRunBelongsToWorkspace, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsAgentAuditTrailService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ packRunId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const { packRunId } = await ctx.params;
    if (!(await packRunBelongsToWorkspace(packRunId, workspaceId))) {
      return notFoundResponse();
    }
    const trails = await getOsAgentAuditTrailService().getTrailForPackRun(packRunId, workspaceId);
    if (trails.length === 0) {
      return notFoundResponse();
    }
    return NextResponse.json({ packRunId, trails });
  } catch (e) {
    console.error("[os/agent-audit/[packRunId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
