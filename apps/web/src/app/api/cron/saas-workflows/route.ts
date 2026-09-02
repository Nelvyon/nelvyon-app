import { NextResponse } from "next/server";
import { getSaasWorkflowService } from "@/../../backend/saas/SaasWorkflowService";
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
import { DbJobsClient } from "@/../../backend/db/DbJobsClient";
import { verifyCronHeader } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  const db = DbJobsClient.getInstance();
  type TenantRow = { id: string };
  const tenants = await db.query<TenantRow>(
    `SELECT DISTINCT tenant_id AS id FROM saas_workflows WHERE status = 'active' AND trigger_type = 'scheduled'`,
    [],
  );

  let dispatched = 0;
  for (const { id: tenantId } of tenants) {
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "scheduled", {
      triggeredAt: new Date().toISOString(),
    });
    dispatched++;
  }

  return NextResponse.json({ ok: true, tenantsDispatched: dispatched, at: new Date().toISOString() });
}
