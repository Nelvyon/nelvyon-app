import { NextResponse } from "next/server";

import { listPortalDeliverablesBff } from "@/lib/portal/portalDeliverablesStore";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("page_size") ?? "20");
  const projectId = url.searchParams.get("project_id") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  try {
    const result = await listPortalDeliverablesBff({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      projectId,
      q,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "deliverables failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
