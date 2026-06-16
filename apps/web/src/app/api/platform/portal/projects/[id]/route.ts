import { NextResponse } from "next/server";

import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";
import { getPortalProjectBff } from "@/lib/portal/portalProjectsStore";

export const { dynamic, runtime } = portalBffDynamic;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  const { id } = await ctx.params;
  try {
    const project = await getPortalProjectBff({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      projectId: id,
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (e: unknown) {
    return portalErrorResponse(e);
  }
}
