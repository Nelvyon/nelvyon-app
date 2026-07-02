import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getLedgerTotals, listLedgerEntries } from "@/lib/partners/partnerConnectStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const [items, totals] = await Promise.all([
    listLedgerEntries(workspaceId, 50),
    getLedgerTotals(workspaceId),
  ]);

  return NextResponse.json({ items, totals, workspace_id: workspaceId });
}
