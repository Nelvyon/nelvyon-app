import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTemplateDnaService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ sectorId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { sectorId } = await ctx.params;
    const svc = getOsTemplateDnaService();
    const scores = await svc.getSectorDna(sectorId, 50);
    const rankMap = await svc.getLearningRankMap(sectorId);
    return NextResponse.json({ sectorId, scores, rankMap: Object.fromEntries(rankMap) });
  } catch (e) {
    console.error("[os/template-dna/[sectorId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
