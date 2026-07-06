import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsCompetitorGapService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const svc = getOsCompetitorGapService();
    const [summary, runs] = await Promise.all([
      svc.getSummary(workspaceId),
      svc.listRuns(50, workspaceId),
    ]);
    return NextResponse.json({ summary, runs });
  } catch (e) {
    console.error("[os/competitor-gap GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
