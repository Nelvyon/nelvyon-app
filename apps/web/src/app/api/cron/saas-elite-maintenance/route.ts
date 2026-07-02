export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSaasAdsOptimizerService,
  getSaasCrmSyncService,
  getSaasHubSpotSyncService,
  refreshCrmAccessTokenIfNeeded,
  refreshHubSpotAccessTokenIfNeeded,
  type CrmConnectorSlug,
} from "@nelvyon/saas";
import { getOsSectorCertificationService } from "@nelvyon/os-agents";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Nightly: evaluate ads optimizer rules + HubSpot pull for connected tenants. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = DbClient.getInstance();
  const adsSvc = getSaasAdsOptimizerService();
  const hubSvc = getSaasHubSpotSyncService();
  let adsTenants = 0;
  let hubspotTenants = 0;
  let crmTenants = 0;

  const adTenants = await db.query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM saas_ads_optimizer_rules WHERE enabled=true`,
  );
  for (const row of adTenants) {
    await adsSvc.evaluateRules(row.tenant_id, []);
    adsTenants++;
  }

  const hubRows = await db.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM saas_integration_connections
     WHERE connector_slug='hubspot' AND status='connected'`,
  );
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

  return NextResponse.json({ ok: true, adsTenants, hubspotTenants, crmTenants, sectorCertBatch });
}
