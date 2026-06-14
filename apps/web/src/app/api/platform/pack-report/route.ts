import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { listPackRunsForWorkspace } from "@/lib/packs/packRunStore";

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
  const packId = url.searchParams.get("pack_id")?.trim() || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5) || 5, 20);

  const runs = await listPackRunsForWorkspace(workspaceId, limit, packId);
  const latest = runs.find((r) => r.status === "completed" || r.status === "needs_review") ?? runs[0];

  return NextResponse.json({
    items: runs,
    latest: latest ?? null,
  });
}
