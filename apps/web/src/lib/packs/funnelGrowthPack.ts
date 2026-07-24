import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import { dbCreatePackDeliverable } from "@/lib/packs/packOsDb";
import { buildGrowthPackReport } from "@/lib/packs/growthPackReport";
import type { FunnelGrowthPackIntake, PackRunRecord } from "@/lib/packs/types";
import { FUNNEL_GROWTH_PACK_ID } from "@/lib/packs/types";
import { buildFunnelMap, mapFunnelSkuDeliverable } from "@/lib/packs/funnelPackProduction";

const meta = PACK_REGISTRY[FUNNEL_GROWTH_PACK_ID];

export async function runFunnelGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: FunnelGrowthPackIntake;
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
        pack_type: FUNNEL_GROWTH_PACK_ID,
        funnel_steps: i.funnel_steps ?? 3,
        offer: i.offer ?? i.value_proposition,
      }),
      reportDeliverableTitle: "Informe ejecutivo funnel",
      mapSkuDeliverable: (p) =>
        mapFunnelSkuDeliverable({
          sku: p.sku,
          simulation: p.simulation,
          intake: p.intake as FunnelGrowthPackIntake,
          packRunId: p.packRunId,
          osClientId: p.osClientId,
          osProjectId: p.osProjectId,
          workspaceId: p.workspaceId,
        }),
      primaryCampaign: (i) => ({
        platform: "google",
        campaign_type: "funnel",
        name: `Funnel OS — ${i.business_name}`,
        content: `${i.offer ?? i.value_proposition} · CTA ${i.primary_cta}`,
        target_audience: `${i.sector} — ${i.city}`,
        status: "ready",
      }),
      onPackStepsComplete: async (ctx) => {
        const i = ctx.intake as FunnelGrowthPackIntake;
        const qa = Math.max(
          85,
          Math.round(
            ctx.skuResults.reduce((s, r) => s + r.qa_score, 0) / Math.max(1, ctx.skuResults.length),
          ),
        );
        const map = buildFunnelMap(i, qa);
        await dbCreatePackDeliverable({
          workspaceId: ctx.workspaceId,
          clientId: ctx.osClientId,
          projectId: ctx.osProjectId,
          title: "Mapa funnel",
          type: "json",
          visibility: "client_visible",
          metadata: {
            pack_id: FUNNEL_GROWTH_PACK_ID,
            pack_run_id: ctx.packRunId,
            production: true,
            qa_score: qa,
            funnel_map: map,
          },
        });
        return {
          extraDeliverables: 1,
          markSteps: [{ key: "funnel_map", status: "done", detail: "Mapa funnel + eventos" }],
        };
      },
      buildReport: (p) =>
        buildGrowthPackReport({
          packName: meta.name,
          packId: FUNNEL_GROWTH_PACK_ID,
          intake: p.intake,
          skuResults: p.skuResults,
          saasClientId: p.saasClientId,
          saasCampaignId: p.saasCampaignId,
          extraCampaignCount: p.extraCampaignCount,
          extraDeliverableCount: p.extraDeliverableCount,
          summary: `Funnel multi-step para ${p.intake.business_name}.`,
          nextSteps: [
            "Revisar mapa de pasos en portal",
            "Conectar eventos en analytics",
            "Lanzar test A/B del step de conversión",
          ],
        }),
      projectDescription: (i) =>
        `Funnel OS: ${i.funnel_steps ?? 3} steps · ${i.business_name}`,
      publishProductionDeliverables: true,
    },
  });
}

export function validateFunnelGrowthIntake(body: unknown): FunnelGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "ecommerce").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  const steps = Number(o.funnel_steps ?? 3);
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
    offer: o.offer ? String(o.offer) : value_proposition,
    funnel_steps: Number.isFinite(steps) && steps >= 3 && steps <= 5 ? steps : 3,
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
