import { NextResponse } from "next/server";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Este cron trabaja sobre TODOS los inquilinos. Con la conexion de peticion
// funciona hoy solo porque `DATABASE_URL` apunta a `postgres`, que salta RLS.
// El dia que apunte a `nelvyon_web_app` —el plan `WEB_DB_ROLE_CUTOVER`— las
// politicas filtrarian fila a fila y este cron NO daria error: devolveria CERO
// FILAS, indistinguible de «no habia trabajo». Es la averia mas cara de
// diagnosticar que puede producir ese cambio.
//
// `DbJobsClient` usa `NELVYON_WEB_JOBS_DATABASE_URL` y cae a `DATABASE_URL`
// mientras esa variable no exista, asi que HOY la conducta es exactamente la
// misma. Lo unico que cambia es que el dia del cutover este cron sigue viendo
// lo que tiene que ver.
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";
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
    const db = DbJobsClient.getInstance();
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
