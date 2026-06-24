/**
 * Cron: monthly GA4 → seed-selector learning loop.
 * Reads GA4 conversion data per pagePath, maps to OS sectors,
 * computes CVR, upserts os_seed_weights table.
 *
 * Railway cron schedule: 0 6 1 * *  (1st of month at 06:00 UTC)
 * Header: x-cron-secret: $CRON_SECRET
 */
import { NextResponse } from "next/server";
import { getOsLearningService } from "@nelvyon/saas";
import { DbClient } from "@/../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query all active GA4 integrations
  const db = DbClient.getInstance();
  const rows = await db.query<{ user_id: string }>(
    `SELECT user_id::text FROM integration_ga4 WHERE is_active = true`,
  );

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, message: "No active GA4 integrations", processed: 0 });
  }

  const svc = getOsLearningService();
  const results = [];
  for (const { user_id } of rows) {
    try {
      const r = await svc.runLearningLoop(user_id);
      results.push({ user_id, ...r });
    } catch (err) {
      results.push({ user_id, error: String(err) });
    }
  }

  const processed = results.filter((r) => !("error" in r)).length;
  return NextResponse.json({ ok: true, processed, results, at: new Date().toISOString() });
}
