import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsLearningLoopProdService,
  getOsLearningService,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const prod = getOsLearningLoopProdService();
    const learning = getOsLearningService();
    const [summary, runs, sectorWeights, topSectors, activeIntegrations] = await Promise.all([
      prod.getSummary(),
      prod.listRuns({ limit: 100 }),
      learning.getSectorWeights().catch(() => ({})),
      learning.getTopSectors(5).catch(() => []),
      prod.ga4ActiveCount(),
    ]);
    const mode = activeIntegrations > 0 ? prod.ga4Mode() : "none";
    return NextResponse.json({
      summary,
      runs,
      sectorWeights,
      topSectors,
      ga4Status: { activeIntegrations, mode },
    });
  } catch (e) {
    console.error("[os/learning GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
