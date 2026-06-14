import { NextResponse } from "next/server";

import { getPackMeta } from "@/lib/packs/packRegistry";
import { getPackRun } from "@/lib/packs/packRunStore";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ packId: string; runId: string }> },
) {
  const { packId, runId } = await ctx.params;

  if (!getPackMeta(packId)) {
    return NextResponse.json({ error: `Pack desconocido: ${packId}` }, { status: 404 });
  }

  const claims = await requirePlatformClaims(_req);
  if (claims instanceof NextResponse) return claims;

  const run = await getPackRun(runId);
  if (!run || run.pack_id !== packId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
