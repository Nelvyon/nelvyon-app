import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { getSaasPwaService } from "@nelvyon/saas";
import { verifyCronBearer } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Dispatch pending workflow push notifications (cron). */
export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;
  if (!process.env.VAPID_PUBLIC_KEY?.trim() || !process.env.VAPID_PRIVATE_KEY?.trim()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "VAPID not configured" });
  }

  try {
    const db = DbClient.getInstance();
    const pending = await db.query<{ id: string; tenant_id: string; title: string; body: string; url: string | null }>(
      `UPDATE saas_pwa_push_queue AS q
       SET dispatched_at = NOW()
       WHERE q.id IN (
         SELECT id FROM saas_pwa_push_queue
         WHERE dispatched_at IS NULL
         ORDER BY created_at ASC
         LIMIT 50
         FOR UPDATE SKIP LOCKED
       )
       RETURNING q.id, q.tenant_id, q.title, q.body, q.url`,
    ).catch(() => [] as Array<{ id: string; tenant_id: string; title: string; body: string; url: string | null }>);

    const pwa = getSaasPwaService();
    let sentTotal = 0;
    let failedTotal = 0;
    for (const row of pending) {
      const result = await pwa.sendPushToTenant(row.tenant_id, {
        title: row.title,
        body: row.body,
        url: row.url ?? undefined,
      });
      sentTotal += result.sent;
      failedTotal += result.failed;
    }
    return NextResponse.json({ ok: true, processed: pending.length, sentTotal, failedTotal });
  } catch (e) {
    console.error("[cron/pwa-push-dispatch]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
