/**
 * Cron endpoint — processes date_reached workflow triggers.
 * Should be called once per day (e.g. 00:05 UTC).
 * Protected by CRON_SECRET header.
 */
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
import { dispatchDateReached } from "../../../../../../../backend/saas/saasWorkflowDispatch";
import { verifyCronFlexible } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = verifyCronFlexible(
    req.headers.get("x-cron-secret"),
    req.headers.get("authorization"),
  );
  if (denied) return denied;

  // Get all unique tenant_ids that have active date_reached workflows
  const db = DbJobsClient.getInstance();
  let rows: { tenant_id: string }[];
  try {
    rows = await db.query<{ tenant_id: string }>(
      `SELECT DISTINCT tenant_id FROM saas_workflows
       WHERE status = 'active' AND trigger_type = 'date_reached'`,
    );
  } catch (e) {
    console.error("[cron/workflow-date] failed to list tenants", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const { tenant_id } of rows) {
    try {
      await dispatchDateReached(tenant_id);
      processed++;
    } catch (e) {
      errors.push(`${tenant_id}: ${String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    date: new Date().toISOString().slice(0, 10),
    tenantsProcessed: processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
