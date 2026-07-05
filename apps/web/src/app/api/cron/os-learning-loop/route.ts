/**
 * Cron: monthly GA4 → seed-selector learning loop.
 * Reads GA4 conversion data per pagePath, maps to OS sectors,
 * computes CVR, upserts os_seed_weights table.
 *
 * Railway cron schedule: 0 6 1 * *  (1st of month at 06:00 UTC)
 * Header: x-cron-secret: $CRON_SECRET
 */
import { NextResponse } from "next/server";
import { getOsLearningLoopProdService } from "@nelvyon/saas";
import { verifyCronHeader } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  // O20 — delegate to the production learning loop (GA4 → weights → templates → seeds)
  const prod = getOsLearningLoopProdService();
  const result = await prod.runProdLoop({ source: "cron" });
  const summary = await prod.getSummary().catch(() => null);

  // O26 — recompute Template DNA scores from fresh weights (best-effort, non-blocking)
  let dnaSectors = 0;
  try {
    const { getOsTemplateDnaService } = await import("@nelvyon/saas");
    const r = await getOsTemplateDnaService().refreshAll();
    dnaSectors = r.sectors;
  } catch { /* dna refresh best-effort */ }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped,
    periodKey: result.periodKey,
    runId: result.runId,
    status: result.status,
    processed: result.skipped ? 0 : result.stats.ga4Users,
    stats: result.stats,
    dnaSectors,
    summary,
    at: new Date().toISOString(),
  });
}
