export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasAutonomyService,
  getSaasTenantMemoryService,
  getSaasCeoBriefService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasPlatformHealthService,
} from "@nelvyon/saas";

/** GET /api/saas/setup — activation checklist + platform health + elite settings */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { DbClient } = await import("../../../../../../../backend/db/DbClient");

    const [reportR, autonomyR, memoryR, briefR, progressR] = await Promise.allSettled([
      getSaasPlatformHealthService().getReport(ctx.tenant.id, ctx.claims.userId),
      getSaasAutonomyService().getMode(ctx.tenant.id),
      getSaasTenantMemoryService().getSettings(ctx.tenant.id),
      getSaasCeoBriefService().getLatestBrief(ctx.tenant.id),
      DbClient.getInstance().query<{ setup_progress: Record<string, unknown> }>(
        `SELECT setup_progress FROM saas_tenants WHERE id = $1 LIMIT 1`,
        [ctx.tenant.id],
      ),
    ]);

    const report =
      reportR.status === "fulfilled"
        ? reportR.value
        : {
            score: 0,
            status: "critical" as const,
            timestamp: new Date().toISOString(),
            items: [],
            activation: { steps: {}, done: 0, total: 0, percent: 0 },
            summary: { platformReady: false, productReady: false, missingCount: 0 },
            error: reportR.reason instanceof Error ? reportR.reason.message : String(reportR.reason),
          };

    const setupProgress =
      progressR.status === "fulfilled" ? (progressR.value[0]?.setup_progress ?? {}) : {};

    return NextResponse.json({
      report,
      setup: report,
      elite: {
        autonomyMode: autonomyR.status === "fulfilled" ? autonomyR.value : "propose",
        memorySettings:
          memoryR.status === "fulfilled"
            ? memoryR.value
            : { maxChunks: 200, autoIngestEnabled: true },
        latestBrief: briefR.status === "fulfilled" ? briefR.value : null,
        setupProgress,
        partialErrors: [
          reportR.status === "rejected" ? "report" : null,
          autonomyR.status === "rejected" ? "autonomy" : null,
          memoryR.status === "rejected" ? "memory" : null,
          briefR.status === "rejected" ? "brief" : null,
          progressR.status === "rejected" ? "setup_progress" : null,
        ].filter(Boolean),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** PATCH /api/saas/setup — update autonomy mode + CEO brief settings */
export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as {
      autonomyMode?: string;
      ceoBriefEnabled?: boolean;
      deliveryHourUtc?: number;
      setupStep?: string;
    };

    const result: Record<string, unknown> = {};

    if (body.autonomyMode === "draft" || body.autonomyMode === "propose" || body.autonomyMode === "execute") {
      result.autonomyMode = await getSaasAutonomyService().setMode(ctx.tenant.id, body.autonomyMode);
    }

    if (body.ceoBriefEnabled != null || body.deliveryHourUtc != null) {
      const { DbClient } = await import("../../../../../../../backend/db/DbClient");
      await DbClient.getInstance().query(
        `INSERT INTO saas_ceo_brief_settings (tenant_id, enabled, delivery_hour_utc)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id) DO UPDATE SET
           enabled = COALESCE($2, saas_ceo_brief_settings.enabled),
           delivery_hour_utc = COALESCE($3, saas_ceo_brief_settings.delivery_hour_utc),
           updated_at = NOW()`,
        [
          ctx.tenant.id,
          body.ceoBriefEnabled ?? true,
          body.deliveryHourUtc ?? 7,
        ],
      );
      result.ceoBriefUpdated = true;
    }

    const ALLOWED_SETUP_STEPS = new Set(["starter_pack", "autonomy", "memory", "geo", "health_ok"]);
    if (body.setupStep && ALLOWED_SETUP_STEPS.has(body.setupStep)) {
      const { DbClient } = await import("../../../../../../../backend/db/DbClient");
      await DbClient.getInstance().query(
        `UPDATE saas_tenants
         SET setup_progress = setup_progress || $2::jsonb, updated_at = NOW()
         WHERE id = $1`,
        [ctx.tenant.id, JSON.stringify({ [body.setupStep]: true, [`${body.setupStep}_at`]: new Date().toISOString() })],
      );
      result.setupStep = body.setupStep;
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
