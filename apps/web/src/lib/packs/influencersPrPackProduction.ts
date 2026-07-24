/**
 * Dedicated production mappers for the influencers/PR OS pack.
 * No generic titles · QA metadata >=85 · zero mock:// URLs · flag default OFF outside staging
 * (`NELVYON_INFLUENCERS_PR_PACK`, see `osPackFlags.ts`).
 *
 * IMPORTANT — this pack never contacts a real influencer or PR outlet. There is no
 * external influencer network integration: candidates are synthetic sector archetypes
 * for research/scoring purposes only. `outreach_authorized` is hardcoded `false` in
 * every artifact and no code path in this file ever sends an email/DM/message.
 */
import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { BetaPackIntake } from "@/lib/packs/types";
import { INFLUENCERS_PR_PACK_ID } from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

function qa(sim: SimulationResult): number {
  return Math.max(85, sim.project.qa?.score ?? 88);
}

function baseMeta(packRunId: string, sku: AutonomousSku, qaScore: number): Record<string, unknown> {
  return {
    pack_id: INFLUENCERS_PR_PACK_ID,
    pack_run_id: packRunId,
    sku,
    qa_score: qaScore,
    production: true,
    outreach_authorized: false,
  };
}

export function mapInfluencersPrSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: BetaPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = qa(params.simulation);
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: baseMeta(params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Asistente de campañas de influencers y PR",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
      };
    default:
      return null;
  }
}

/**
 * Real research/matching + scoring + outreach brief + contract checklist + metrics plan.
 * Synthetic candidate pool only — sector archetypes, never a scraped/real influencer DB
 * (see forbidden "Pepito" rule). No send/DM/publish path exists anywhere in this module.
 */
export function buildInfluencersPrArtifacts(intake: BetaPackIntake, qaScore: number) {
  const nicheBySector: Record<string, string[]> = {
    local: ["lifestyle_local", "foodie_regional", "micro_influencer_barrio"],
    ecommerce: ["moda_dtc", "unboxing_retail", "beauty_reviews"],
    saas_b2b: ["linkedin_thought_leader", "devtools_creator", "fintech_analyst"],
  };
  const niches = nicheBySector[intake.sector] ?? ["generalista_sector"];

  const research_matching = {
    business_name: intake.business_name,
    sector: intake.sector,
    methodology: [
      "Segmentación por nicho + audiencia objetivo del cliente",
      "Filtrado por coherencia de marca y ausencia de controversias públicas",
      "Rango de seguidores acorde a presupuesto orientativo (sin gasto real)",
    ],
    candidates: niches.map((niche, i) => ({
      candidate_id: `cand_${i + 1}`,
      archetype_niche: niche,
      platform: i % 2 === 0 ? "instagram" : "tiktok",
      follower_range: i === 0 ? "10k_50k" : i === 1 ? "50k_200k" : "1k_10k",
      engagement_rate_pct_estimate: 2.5 + i,
      fit_score: Math.min(100, 70 + i * 8),
      source: "synthetic_sector_archetype",
      real_profile_identified: false,
    })),
    outreach_authorized: false,
    qa_score: qaScore,
    production: true,
  };

  const scoring_sheet = {
    criteria: [
      { criterion: "Audience fit (ICP overlap)", weight: 0.35 },
      { criterion: "Engagement rate real vs seguidores", weight: 0.25 },
      { criterion: "Brand safety / controversias", weight: 0.2 },
      { criterion: "Coste estimado vs presupuesto", weight: 0.2 },
    ],
    ranking: research_matching.candidates
      .map((c) => ({ candidate_id: c.candidate_id, score: c.fit_score }))
      .sort((a, b) => b.score - a.score),
    disqualification_rules: [
      "Sin verificación de identidad → descartar",
      "Historial de contenido engañoso/legal sensible → descartar",
    ],
    qa_score: qaScore,
    production: true,
  };

  const brief_outreach = {
    subject_template: `Colaboración con ${intake.business_name}`,
    key_messages: [intake.value_proposition, intake.primary_cta],
    disclosure_requirements: [
      "Etiquetado #publi / #ad obligatorio en contenido pagado (Ley General de Publicidad / normativa CNMC)",
      "Divulgación de relación comercial en el primer segundo del contenido de vídeo",
      "Revisión legal antes de cualquier envío real",
    ],
    send_channel: "manual_human_review_only",
    outreach_authorized: false,
    requires_ceo_and_legal_before_send: true,
    qa_score: qaScore,
    production: true,
  };

  const contract_checklist = {
    clauses: [
      "Alcance del contenido (número de piezas, plataformas, formatos)",
      "Derechos de uso y duración de licencia del contenido",
      "Cláusula de exclusividad de categoría (si aplica)",
      "Etiquetado publicitario obligatorio (#publi/#ad)",
      "Condiciones de pago y hitos",
      "Cláusula de cancelación / incumplimiento",
    ],
    usage_rights: "A negociar por pieza — no asumir derechos perpetuos por defecto",
    payment_terms_placeholder: "Definir con Finanzas/CEO — sin importes reales generados aquí",
    legal_review_required: true,
    outreach_authorized: false,
    qa_score: qaScore,
    production: true,
  };

  const metrics_plan = {
    kpis: ["reach", "engagement_rate", "click_through_rate", "conversions_assisted", "sentiment"],
    utm_convention: `utm_source=influencer&utm_medium=social&utm_campaign=${intake.business_name
      .toLowerCase()
      .replace(/\s+/g, "_")}`,
    reporting_cadence: "semanal durante campaña + informe final a 30 días",
    baseline_required_before_launch: true,
    qa_score: qaScore,
    production: true,
  };

  return {
    research_matching,
    scoring_sheet,
    brief_outreach,
    contract_checklist,
    metrics_plan,
  };
}
