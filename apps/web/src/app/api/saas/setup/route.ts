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
    const [report, autonomyMode, memorySettings, latestBrief] = await Promise.all([
      getSaasPlatformHealthService().getReport(ctx.tenant.id, ctx.claims.userId),
      getSaasAutonomyService().getMode(ctx.tenant.id),
      getSaasTenantMemoryService().getSettings(ctx.tenant.id),
      getSaasCeoBriefService().getLatestBrief(ctx.tenant.id),
    ]);
    return NextResponse.json({
      report,
      setup: report,
      elite: { autonomyMode, memorySettings, latestBrief },
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

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
