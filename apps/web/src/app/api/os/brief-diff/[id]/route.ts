import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsBriefDiffRerunService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const { id } = await ctx.params;
    const diff = await getOsBriefDiffRerunService().getDiff(id);
    if (!diff || diff.workspaceId !== workspaceId) {
      return notFoundResponse();
    }
    return NextResponse.json({ diff });
  } catch (e) {
    console.error("[os/brief-diff/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
