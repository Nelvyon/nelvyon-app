import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { buildGrowthPackReport } from "@/lib/packs/growthPackReport";
import type { PackRunRecord, RetentionPackIntake } from "@/lib/packs/types";
import { RETENTION_PACK_ID } from "@/lib/packs/types";
import {
  buildRetentionPlan,
  mapRetentionSkuDeliverable,
} from "@/lib/packs/retentionPackProduction";

const meta = PACK_REGISTRY[RETENTION_PACK_ID];

export async function runRetentionPack(params: {
  workspaceId: number;
  userId: string;
  intake: RetentionPackIntake;
  idempotencyKey?: string;
  onRunCreated?: (run: PackRunRecord) => void;
}): Promise<PackRunRecord> {
  const { intake } = params;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    idempotencyKey: params.idempotencyKey,
    onRunCreated: params.onRunCreated,
    config: {
      meta,
      intake,
      buildBrief: (i) => ({
        ...buildBaseBrief({ ...i, sector: i.sector }),
        pack_type: RETENTION_PACK_ID,
        retention: {
          cohort: i.cohort ?? "active_30d",
          channels: i.channels ?? ["email", "crm"],
          loyalty_goal: i.loyalty_goal ?? "reduce_churn",
        },
      }),
      reportDeliverableTitle: "Informe ejecutivo retención",
      mapSkuDeliverable: (p) =>
        mapRetentionSkuDeliverable({
          sku: p.sku,
          simulation: p.simulation,
          intake: p.intake as RetentionPackIntake,
          packRunId: p.packRunId,
          osClientId: p.osClientId,
          osProjectId: p.osProjectId,
          workspaceId: p.workspaceId,
        }),
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "retention",
        name: `Retention — ${i.business_name}`,
        content: `Secuencia retención · goal ${i.loyalty_goal ?? "reduce_churn"}`,
        target_audience: `${i.cohort ?? "active_30d"} — ${i.city}`,
        status: "ready",
      }),
      onPackStepsComplete: async (ctx) => {
        const i = ctx.intake as RetentionPackIntake;
        const qa = Math.max(
          85,
          Math.round(
            ctx.skuResults.reduce((s, r) => s + r.qa_score, 0) / Math.max(1, ctx.skuResults.length),
          ),
        );
        const plan = buildRetentionPlan(i, qa);
        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Secuencia retención",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: RETENTION_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            qa_score: qa,
            retention_plan: plan,
          },
        });
        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Reglas churn",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: RETENTION_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            qa_score: qa,
            churn_rules: plan.churn_rules,
          },
        });
        return {
          extraDeliverables: 2,
          markSteps: [{ key: "retention_plan", status: "done", detail: "Secuencia + churn rules" }],
        };
      },
      buildReport: (p) =>
        buildGrowthPackReport({
          packName: meta.name,
          packId: RETENTION_PACK_ID,
          intake: p.intake,
          skuResults: p.skuResults,
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          extraCampaignCount: p.extraCampaignCount,
          extraDeliverableCount: p.extraDeliverableCount,
          summary: `Plan de retención para ${p.intake.business_name}.`,
          nextSteps: [
            "Activar secuencia en workflows SaaS",
            "Conectar cohort CRM",
            "Medir churn a 30/60 días",
          ],
        }),
      projectDescription: (i) =>
        `Retention OS: ${i.loyalty_goal ?? "reduce_churn"} · ${i.business_name}`,
      publishProductionDeliverables: true,
    },
  });
}

export function validateRetentionPackIntake(body: unknown): RetentionPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "saas_b2b").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  const channels = Array.isArray(o.channels)
    ? o.channels.map((c) => String(c).trim()).filter(Boolean).slice(0, 4)
    : undefined;
  return {
    business_name,
    sector,
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    cohort: o.cohort ? String(o.cohort) : "active_30d",
    channels: channels?.length ? channels : ["email", "crm"],
    loyalty_goal: o.loyalty_goal ? String(o.loyalty_goal) : "reduce_churn",
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
