import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsBriefDiffRerunService, type BriefDiffStatus } from "@nelvyon/saas";

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
    const status = searchParams.get("status") as BriefDiffStatus | null;
    const svc = getOsBriefDiffRerunService();
    const [summary, diffs] = await Promise.all([
      svc.getSummary(workspaceId),
      svc.listDiffs({
        sourcePackRunId: searchParams.get("sourcePackRunId") ?? undefined,
        status: status ?? undefined,
        workspaceId,
        limit: 100,
      }),
    ]);
    return NextResponse.json({ summary, diffs });
  } catch (e) {
    console.error("[os/brief-diff GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
