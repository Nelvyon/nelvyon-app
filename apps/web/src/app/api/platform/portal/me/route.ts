import { NextResponse } from "next/server";

import { getPortalUserBff } from "@/lib/portal/portalAuthStore";
import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";

export const { dynamic, runtime } = portalBffDynamic;

export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  try {
    const user = await getPortalUserBff({
      portalUserId: claims.portalUserId,
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
    });
    if (!user) {
      return NextResponse.json({ error: "Portal user not found or inactive" }, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (e: unknown) {
    return portalErrorResponse(e);
  }
}
