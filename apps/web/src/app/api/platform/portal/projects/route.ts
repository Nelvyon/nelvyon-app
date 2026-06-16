import { NextResponse } from "next/server";

import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";
import { listPortalProjectsBff } from "@/lib/portal/portalProjectsStore";

export const { dynamic, runtime } = portalBffDynamic;

export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "20");
  const q = url.searchParams.get("q") ?? undefined;

  try {
    const result = await listPortalProjectsBff({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      q,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return portalErrorResponse(e);
  }
}
