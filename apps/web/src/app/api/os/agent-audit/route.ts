import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsAgentAuditTrailService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const { searchParams } = new URL(req.url);
    const svc = getOsAgentAuditTrailService();
    const [summary, events] = await Promise.all([
      svc.getSummary(workspaceId),
      svc.listEvents({
        packRunId: searchParams.get("packRunId") ?? undefined,
        sku: searchParams.get("sku") ?? undefined,
        agentId: searchParams.get("agentId") ?? undefined,
        workspaceId,
        limit: 100,
      }),
    ]);
    return NextResponse.json({ summary, events });
  } catch (e) {
    console.error("[os/agent-audit GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
