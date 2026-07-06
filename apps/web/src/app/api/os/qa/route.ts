import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsVisualQaGateService } from "../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const svc = getOsVisualQaGateService();
    const [summary, recentRuns] = await Promise.all([
      svc.getGateSummary(),
      svc.listAuditRuns({ limit: 50, workspaceId }),
    ]);
    return NextResponse.json({ summary, recentRuns });
  } catch (e) {
    console.error("[os/qa GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
