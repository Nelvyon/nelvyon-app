import { NextResponse } from "next/server";

import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";
import { getOsRetainerAutopilotService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Client portal — current month retainer view (services expected vs delivered). */
export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }

  try {
    const view = await getOsRetainerAutopilotService().getPortalRetainerViewByWorkspace(claims.workspaceId);
    return NextResponse.json(view);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "retainer failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
