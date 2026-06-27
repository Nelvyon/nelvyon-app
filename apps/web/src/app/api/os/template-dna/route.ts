import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTemplateDnaService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsTemplateDnaService();
    const [summary, topSeeds] = await Promise.all([svc.getSummary(), svc.getTopSeedsAcrossSectors(50)]);
    const sectors = [...new Set(topSeeds.map((s) => s.sectorId))];
    return NextResponse.json({ summary, topSeeds, sectors });
  } catch (e) {
    console.error("[os/template-dna GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
