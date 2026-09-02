export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
import { verifyCronBearer } from "@/lib/cronAuth";

/** Weekly SaaS competitor gap digest per tenant with configured domain */
export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;

  const db = DbJobsClient.getInstance();
  const tenants = await db.query<{ id: string; website: string | null }>(
    `SELECT id, website FROM saas_tenants WHERE website IS NOT NULL AND website != '' LIMIT 100`,
  );
  let processed = 0;

  for (const t of tenants) {
    if (!t.website) continue;
    try {
      const runs = await db.query<{ id: string }>(
        `SELECT id FROM os_competitor_gap_runs WHERE tenant_id = $1::uuid
         ORDER BY started_at DESC LIMIT 1`,
        [t.id],
      );
      if (runs.length === 0) continue;
      processed++;
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true, tenantsChecked: tenants.length, processed });
}
