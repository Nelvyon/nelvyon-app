import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { createBriefDiffRunnerPort } from "@/lib/packs/briefDiffRunnerPort";
import { getOsBriefDiffRerunService, OsBriefDiffError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  const { id } = await ctx.params;
  let body: { execute?: boolean } = {};
  try {
    body = (await req.json()) as { execute?: boolean };
  } catch {
    /* default execute true */
  }
  const execute = body.execute !== false;

  try {
    const svc = getOsBriefDiffRerunService();
    const diff = await svc.getDiff(id);
    if (!diff || diff.workspaceId !== workspaceId) {
      return notFoundResponse();
    }
    if (!execute) {
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
