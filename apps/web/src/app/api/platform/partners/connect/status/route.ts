import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getPartnerConnectStatus, maybeSeedDemoLedger } from "@/lib/partners/partnerConnectService";

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

  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1" || url.searchParams.get("refresh") === "true";

  await maybeSeedDemoLedger(workspaceId);
  const connect = await getPartnerConnectStatus(workspaceId, refresh);

  return NextResponse.json({ connect, workspace_id: workspaceId });
}
