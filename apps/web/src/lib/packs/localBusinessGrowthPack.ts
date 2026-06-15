import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import { applyEliteTemplatesToBrief, resolveTemplatesForSector } from "@/lib/packs/packEliteTemplates";
import { buildBaseBrief, runGrowthPack } from "@/lib/packs/packOrchestrator";
import type {
  LocalGrowthPackIntake,
  PackReport,
  PackRunRecord,
  SkuRunResult,
} from "@/lib/packs/types";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = PACK_REGISTRY[LOCAL_GROWTH_PACK_ID];

export function buildBriefFromIntake(intake: LocalGrowthPackIntake): Record<string, unknown> {
  const base = buildBaseBrief({ ...intake, sector: intake.sector });
  return applyEliteTemplatesToBrief(base, resolveTemplatesForSector(intake.sector));
}

function buildPackReport(params: {
  intake: LocalGrowthPackIntake;
  skuResults: SkuRunResult[];
  saasClientId: number;
  saasCampaignId: number;
  extraCampaignCount: number;
  extraDeliverableCount: number;
}): PackReport {
  const passed = params.skuResults.filter((r) => r.passed);
  const avgQa =
    params.skuResults.length > 0
      ? Math.round(
          params.skuResults.reduce((a, r) => a + r.qa_score, 0) / params.skuResults.length,
        )
      : 0;
  const deliverables =
    params.skuResults.reduce((a, r) => a + r.deliverable_ids.length, 0) +
    1 +
    params.extraDeliverableCount;

  return {
    pack_name: meta.name,
    pack_id: LOCAL_GROWTH_PACK_ID,
    business_name: params.intake.business_name,
    sector: params.intake.sector,
    completed_at: new Date().toISOString(),
    summary: `${passed.length}/${params.skuResults.length} servicios autónomos entregados con QA ≥ umbral. Landing, SEO y chatbot listos para revisión en portal.`,
    kpis: {
      deliverables_published: deliverables,
      avg_qa_score: avgQa,
      skus_passed: passed.length,
      skus_total: params.skuResults.length,
      saas_client_id: params.saasClientId,
      saas_campaign_id: params.saasCampaignId,
      extra_campaigns: params.extraCampaignCount,
    },
    sku_results: params.skuResults,
    next_steps: [
      "Revisar entregables en el portal del cliente",
      "Conectar dominio propio y pixel de conversión",
      "Activar campaña de bienvenida por email",
      "Programar revisión SEO a 30 días",
    ],
    portal_path: "/portal",
  };
}

export async function runLocalBusinessGrowthPack(params: {
  workspaceId: number;
  userId: string;
  intake: LocalGrowthPackIntake;
}): Promise<PackRunRecord> {
  const { intake } = params;
  return runGrowthPack({
    workspaceId: params.workspaceId,
    userId: params.userId,
    config: {
      meta,
      intake,
      buildBrief: buildBriefFromIntake,
      primaryCampaign: (i) => ({
        platform: "email",
        campaign_type: "welcome",
        name: `Bienvenida — ${i.business_name}`,
        content: `Secuencia de bienvenida para ${i.business_name}. CTA: ${i.primary_cta}`,
        target_audience: `${i.sector} — ${i.city}`,
        status: "ready",
      }),
      buildReport: buildPackReport,
      projectDescription: (i) =>
        `Pack local: landing + SEO + chatbot para ${i.sector} en ${i.city}`,
    },
  });
}

export function validateLocalGrowthIntake(body: unknown): LocalGrowthPackIntake | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const sectors = new Set(meta.sectors.map((s) => s.id));
  const sector = String(o.sector ?? "").trim();
  if (!sectors.has(sector)) return null;
  const business_name = String(o.business_name ?? "").trim();
  const city = String(o.city ?? "").trim();
  const value_proposition = String(o.value_proposition ?? "").trim();
  const primary_cta = String(o.primary_cta ?? "").trim();
  if (!business_name || !city || !value_proposition || !primary_cta) return null;
  return {
    business_name,
    sector: sector as LocalGrowthPackIntake["sector"],
    city,
    country: o.country ? String(o.country) : "ES",
    contact_email: o.contact_email ? String(o.contact_email) : undefined,
    contact_name: o.contact_name ? String(o.contact_name) : undefined,
    website_url: o.website_url ? String(o.website_url) : undefined,
    value_proposition,
    primary_cta,
    tier: o.tier === "premium" ? "premium" : "professional",
  };
}
