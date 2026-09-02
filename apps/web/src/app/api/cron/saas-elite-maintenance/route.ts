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
import {
  getSaasAdsOptimizerService,
  getSaasCrmSyncService,
  getSaasHubSpotSyncService,
  refreshCrmAccessTokenIfNeeded,
  refreshHubSpotAccessTokenIfNeeded,
  type CrmConnectorSlug,
} from "@nelvyon/saas";
import { getOsSectorCertificationService } from "@nelvyon/os-agents";
import { verifyCronBearer } from "@/lib/cronAuth";
import { runWithCronDeadline } from "../../../../../../../backend/http/cronDeadline";

/** Nightly: evaluate ads optimizer rules + HubSpot pull for connected tenants. */
export async function GET(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;

  try {
    const result = await runWithCronDeadline("saas-elite-maintenance", async () => {
      const db = DbJobsClient.getInstance();
      const adsSvc = getSaasAdsOptimizerService();
      const hubSvc = getSaasHubSpotSyncService();
      let adsTenants = 0;
      let hubspotTenants = 0;
      let crmTenants = 0;

      try {
        const adTenants = await db.query<{ tenant_id: string }>(
          `SELECT DISTINCT tenant_id FROM saas_ads_optimizer_rules WHERE enabled=true`,
        );
        for (const row of adTenants) {
          await adsSvc.evaluateRules(row.tenant_id, []);
          adsTenants++;
        }
      } catch {
        /* migration 482 optional until migrate */
      }

      let hubRows: { tenant_id: string }[] = [];
      try {
        hubRows = await db.query<{ tenant_id: string }>(
          `SELECT tenant_id FROM saas_integration_connections
           WHERE connector_slug='hubspot' AND status='connected'`,
        );
      } catch {
        hubRows = [];
      }
      for (const row of hubRows) {
        try {
          const token = await refreshHubSpotAccessTokenIfNeeded(row.tenant_id);
          if (!token) continue;
          await hubSvc.runSync(row.tenant_id, token);
          hubspotTenants++;
        } catch {
          /* continue other tenants */
        }
      }

      const crmSlugs: Exclude<CrmConnectorSlug, "hubspot">[] = ["salesforce", "pipedrive", "zoho"];
      const crmSvc = getSaasCrmSyncService();
      for (const slug of crmSlugs) {
        const rows = await db.query<{ tenant_id: string }>(
          `SELECT tenant_id FROM saas_integration_connections WHERE connector_slug=$1 AND status='connected'`,
          [slug],
        );
        for (const row of rows) {
          try {
            const token = await refreshCrmAccessTokenIfNeeded(row.tenant_id, slug);
            if (!token) continue;
            await crmSvc.runSync(row.tenant_id, slug, token);
            crmTenants++;
          } catch {
            /* continue */
          }
        }
      }

      let sectorCertBatch = { processed: 0, passed: 0, failed: 0 };
      try {
        sectorCertBatch = await getOsSectorCertificationService().runBatchCertification();
      } catch {
        /* non-blocking */
      }

      return { ok: true as const, adsTenants, hubspotTenants, crmTenants, sectorCertBatch };
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    console.error("[cron/saas-elite-maintenance]", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 504 });
  }
}
