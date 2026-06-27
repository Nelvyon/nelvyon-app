import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRegulatedSectorShieldService, EU_DISCLAIMERS } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ sectorId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { sectorId } = await ctx.params;
    const svc = getOsRegulatedSectorShieldService();
    const audits = await svc.listAudits({ sectorId, limit: 50 });
    return NextResponse.json({ sectorId, disclaimer: EU_DISCLAIMERS[sectorId] ?? null, audits });
  } catch (e) {
    console.error("[os/shield/[sectorId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
