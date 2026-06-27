import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsLearningLoopProdService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** POST { period? } — manually run the production learning loop (admin, idempotent). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { period?: string };
    const result = await getOsLearningLoopProdService().runProdLoop({ source: "manual", period: body.period });
    return NextResponse.json({
      runId: result.runId,
      periodKey: result.periodKey,
      status: result.status,
      skipped: result.skipped,
      stats: result.stats,
    });
  } catch (e) {
    console.error("[os/learning/trigger POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
