import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsSectorReadinessService } from "../../../../../../../../backend/os-agents/sectors/OsSectorReadinessService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Recompute readiness for all 20 sectors and persist. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsSectorReadinessService();
    const sectors = await svc.refreshAll();
    return NextResponse.json({ refreshed: sectors.length, sectors });
  } catch (e) {
    console.error("[os/sectors/refresh POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
