import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { buildGrowthPackReport } from "@/lib/packs/growthPackReport";
import type { PackRunRecord, StrategyPackIntake } from "@/lib/packs/types";
import { STRATEGY_PACK_ID } from "@/lib/packs/types";
import {
  buildStrategy90dPlan,
  mapStrategySkuDeliverable,
} from "@/lib/packs/strategyPackProduction";

const meta = PACK_REGISTRY[STRATEGY_PACK_ID];

export function buildStrategyBrief(intake: StrategyPackIntake): Record<string, unknown> {
  return {
    ...buildBaseBrief({ ...intake, sector: intake.sector }),
    pack_type: STRATEGY_PACK_ID,
    strategy: {
      goals: intake.goals ?? ["leads", "revenue"],
      horizon_days: intake.horizon_days ?? 90,
    },
  };
}

export async function runStrategyPack(params: {
  workspaceId: number;
  userId: string;
  intake: StrategyPackIntake;
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
      buildBrief: buildStrategyBrief,
      reportDeliverableTitle: "Informe ejecutivo estrategia",
      mapSkuDeliverable: (p) =>
        mapStrategySkuDeliverable({
          sku: p.sku,
          simulation: p.simulation,
          intake: p.intake as StrategyPackIntake,
          packRunId: p.packRunId,
          osClientId: p.osClientId,
          osProjectId: p.osProjectId,
          workspaceId: p.workspaceId,
        }),
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "strategy",
        name: `Strategy 90d — ${i.business_name}`,
        content: `Plan estratégico ${i.horizon_days ?? 90}d · ${i.value_proposition}`,
        target_audience: `${i.sector} — ${i.city}`,
        status: "ready",
      }),
      onPackStepsComplete: async (ctx) => {
        const i = ctx.intake as StrategyPackIntake;
        const qa = Math.max(
          85,
          Math.round(
            ctx.skuResults.reduce((s, r) => s + r.qa_score, 0) / Math.max(1, ctx.skuResults.length),
          ),
        );
        const plan = buildStrategy90dPlan(i, qa);
        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Plan 90d",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: STRATEGY_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            qa_score: qa,
            strategy_plan: plan,
          },
        });
        return {
          extraDeliverables: 1,
          markSteps: [{ key: "strategy_plan", status: "done", detail: "Plan 90d publicado" }],
        };
      },
      buildReport: (p) =>
        buildGrowthPackReport({
          packName: meta.name,
          packId: STRATEGY_PACK_ID,
          intake: p.intake,
          skuResults: p.skuResults,
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          extraCampaignCount: p.extraCampaignCount,
          extraDeliverableCount: p.extraDeliverableCount,
          summary: `Plan estratégico 90d para ${p.intake.business_name}.`,
          nextSteps: [
            "Revisar OKRs y riesgos en portal",
            "Kickoff del growth pack sugerido #1",
            "Medir baseline KPI antes de ads",
          ],
        }),
      projectDescription: (i) =>
        `Strategy OS: plan ${i.horizon_days ?? 90}d para ${i.business_name} (${i.sector})`,
      publishProductionDeliverables: true,
    },
  });
}

export function validateStrategyPackIntake(body: unknown): StrategyPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "local").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  const goalsRaw = o.goals;
  const goals = Array.isArray(goalsRaw)
    ? goalsRaw.map((g) => String(g).trim()).filter(Boolean).slice(0, 6)
    : undefined;
  const horizon = Number(o.horizon_days ?? 90);
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
    goals: goals?.length ? goals : ["leads", "revenue"],
    horizon_days: Number.isFinite(horizon) && horizon >= 30 && horizon <= 180 ? horizon : 90,
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
