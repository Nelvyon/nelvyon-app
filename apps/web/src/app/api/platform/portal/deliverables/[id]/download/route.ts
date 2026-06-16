import { NextResponse } from "next/server";

import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { resolvePortalDeliverableDownloadBff } from "@/lib/portal/portalDeliverablesStore";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";

export const { dynamic, runtime } = portalBffDynamic;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  const { id } = await ctx.params;
  try {
    const url = await resolvePortalDeliverableDownloadBff({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      deliverableId: id,
    });
    if (!url) {
      return NextResponse.json({ error: "No file attached to this deliverable" }, { status: 404 });
    }
    return NextResponse.redirect(url, 302);
  } catch (e: unknown) {
    return portalErrorResponse(e);
  }
}
