import { NextResponse } from "next/server";

import { getPackMeta } from "@/lib/packs/packRegistry";
import { getPackRun } from "@/lib/packs/packRunStore";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ packId: string; runId: string }> },
) {
  const { packId, runId } = await ctx.params;

  if (!getPackMeta(packId)) {
    return NextResponse.json({ error: `Pack desconocido: ${packId}` }, { status: 404 });
  }

  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }

  const run = await getPackRun(runId);
  if (!run || run.pack_id !== packId || run.workspace_id !== workspaceId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
