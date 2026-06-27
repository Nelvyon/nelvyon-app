import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { createBriefDiffRunnerPort } from "@/lib/packs/briefDiffRunnerPort";
import { getOsBriefDiffRerunService, OsBriefDiffError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const { id } = await ctx.params;
  let body: { execute?: boolean } = {};
  try {
    body = (await req.json()) as { execute?: boolean };
  } catch {
    /* default execute true */
  }
  const execute = body.execute !== false;
  const workspaceId = parseWorkspaceId(req) ?? undefined;

  try {
    const svc = getOsBriefDiffRerunService();
    if (!execute) {
      const diff = await svc.getDiff(id);
      if (!diff) return NextResponse.json({ error: "Diff not found" }, { status: 404 });
      return NextResponse.json({ diff });
    }
    const result = await svc.executeRerun(id, {
      userId: claims.userId,
      workspaceId,
      runner: createBriefDiffRunnerPort(),
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OsBriefDiffError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "NO_CHANGE" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[os/brief-diff/[id]/rerun POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
