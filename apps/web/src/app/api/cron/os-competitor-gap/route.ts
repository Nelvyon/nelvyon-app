export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getOsCompetitorGapService } from "@nelvyon/saas";

function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Weekly digest — lists recent gap runs for OS dashboard (no auto-analyze). */
export async function POST(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  try {
    const svc = getOsCompetitorGapService();
    const [summary, runs] = await Promise.all([
      svc.getSummary(),
      svc.listRuns(20),
    ]);
    return NextResponse.json({
      ok: true,
      summary,
      recentRuns: runs.length,
      completed: runs.filter((r) => r.status === "completed").length,
    });
  } catch (e) {
    console.error("[cron/os-competitor-gap]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
