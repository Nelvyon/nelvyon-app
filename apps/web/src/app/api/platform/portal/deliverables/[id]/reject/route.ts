import { NextResponse } from "next/server";

import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { rejectPortalDeliverableBff } from "@/lib/portal/portalDeliverablesStore";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";

export const { dynamic, runtime } = portalBffDynamic;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  const { id } = await ctx.params;
  let body: { feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await rejectPortalDeliverableBff({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      portalUserId: claims.portalUserId,
      deliverableId: id,
      feedback: body.feedback ?? "",
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return portalErrorResponse(e);
  }
}
