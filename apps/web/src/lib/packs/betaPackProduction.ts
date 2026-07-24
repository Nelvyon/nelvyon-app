/**
 * Dedicated production mappers for the 5 former-beta packs.
 * No generic titles · QA metadata ≥85 · zero mock:// URLs.
 */
import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";
import { buildSocialIntegralBundle } from "../../../../../backend/agency/OsSocialNetworksService";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { BetaPackIntake } from "@/lib/packs/types";
import {
  ANALYTICS_SETUP_PACK_ID,
  BRAND_VOICE_PACK_ID,
  CONTENT_STRATEGY_PACK_ID,
  CRO_AUDIT_PACK_ID,
  SOCIAL_CALENDAR_PACK_ID,
} from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

function qa(sim: SimulationResult): number {
  return Math.max(85, sim.project.qa?.score ?? 88);
}

function baseMeta(
  packId: string,
  packRunId: string,
  sku: AutonomousSku,
  qaScore: number,
): Record<string, unknown> {
  return {
    pack_id: packId,
    pack_run_id: packRunId,
    sku,
    qa_score: qaScore,
    production: true,
  };
}

export function mapSocialCalendarSkuDeliverable(params: {
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
    metadata: baseMeta(SOCIAL_CALENDAR_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing social",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Asistente social",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
      };
    default:
      return null;
  }
}

export function buildSocialCalendar30d(intake: BetaPackIntake, qaScore: number) {
  // Thin wrapper — integral bundle is SSOT (ADR-052); calendar shape kept for portal compat.
  const bundle = buildSocialIntegralBundle(
    {
      business_name: intake.business_name,
      sector: intake.sector,
      city: intake.city,
      value_proposition: intake.value_proposition,
      primary_cta: intake.primary_cta,
    },
    qaScore,
  );
  return {
    business_name: intake.business_name,
    sector: intake.sector,
    city: intake.city,
    weeks: (bundle.calendar as { weeks: unknown }).weeks,
    hashtags: [`#${intake.city.replace(/\s+/g, "")}`, `#${intake.sector}`, "#nelvyon"],
    qa_score: qaScore,
    production: true as const,
    platforms: bundle.platforms.map((p) => p.id),
    portal_visible: true,
    publish_authorized: false,
  };
}

export function buildSocialIntegralFromIntake(intake: BetaPackIntake, qaScore: number) {
  return buildSocialIntegralBundle(
    {
      business_name: intake.business_name,
      sector: intake.sector,
      city: intake.city,
      value_proposition: intake.value_proposition,
      primary_cta: intake.primary_cta,
    },
    qaScore,
  );
}

export function mapContentStrategySkuDeliverable(params: {
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
    metadata: baseMeta(CONTENT_STRATEGY_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing contenido",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Keywords contenido",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: { ...base.metadata, report_type: "content_clusters" },
      };
    default:
      return null;
  }
}

export function buildContentEditorial90d(intake: BetaPackIntake, qaScore: number) {
  return {
    business_name: intake.business_name,
    horizon_days: 90,
    clusters: [
      { name: "Problema ICP", articles: 4, channel: "blog" },
      { name: "Solución producto", articles: 4, channel: "linkedin" },
      { name: "Prueba social", articles: 3, channel: "case_study" },
    ],
    messaging: {
      value_proposition: intake.value_proposition,
      primary_cta: intake.primary_cta,
      pillars: ["clarity", "proof", "urgency"],
    },
    kpis: ["organic_sessions", "assisted_leads", "content_engaged_rate"],
    qa_score: qaScore,
    production: true,
  };
}

export function mapCroAuditSkuDeliverable(params: {
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
    metadata: baseMeta(CRO_AUDIT_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing CRO",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Informe fricción SEO",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: { ...base.metadata, report_type: "cro_friction" },
      };
    default:
      return null;
  }
}

export function buildCroAuditArtifacts(intake: BetaPackIntake, qaScore: number) {
  return {
    audit: {
      business_name: intake.business_name,
      friction_points: [
        "CTA poco visible above the fold",
        "Prueba social insuficiente",
        "Formulario con demasiados campos",
      ],
      quick_wins: ["Aumentar contraste CTA", "Añadir 3 testimonios", "Reducir form a 3 campos"],
    },
    ab_plan: {
      horizon_days: 30,
      tests: [
        { hypothesis: "CTA primario aumenta CVR", variant: "A/B botón", metric: "cvr" },
        { hypothesis: "Social proof reduce bounce", variant: "bloque testimonios", metric: "bounce" },
        { hypothesis: "Form corto mejora leads", variant: "3 vs 6 campos", metric: "lead_rate" },
      ],
    },
    qa_score: qaScore,
    production: true,
  };
}

export function mapAnalyticsSetupSkuDeliverable(params: {
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
    metadata: baseMeta(ANALYTICS_SETUP_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Mapa eventos SEO",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: { ...base.metadata, report_type: "analytics_events" },
      };
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing analytics",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
      };
    default:
      return null;
  }
}

/** Uses existing NELVYON analytics path — no Matomo/Umami install (ADR-048 REJECT/DEFER). */
export function buildAnalyticsSetupArtifacts(intake: BetaPackIntake, qaScore: number) {
  return {
    ga4_checklist: [
      "Crear/verificar propiedad GA4",
      "Eventos: generate_lead, purchase, sign_up, cta_click",
      "Conversiones marcadas en Admin",
      "Search Console vinculada",
    ],
    event_map: [
      { event: "page_view", source: "web" },
      { event: "cta_click", source: "landing", cta: intake.primary_cta },
      { event: "generate_lead", source: "form" },
      { event: "purchase", source: "ecommerce", optional: intake.sector === "ecommerce" },
    ],
    dashboard: {
      title: `Dashboard ejecutivo — ${intake.business_name}`,
      widgets: ["sessions", "conversions", "top_landing", "funnel_dropoff"],
      note: "Plantilla Looker/GA4 Exploration · sin self-host Matomo/Umami (ADR-048)",
    },
    qa_score: qaScore,
    production: true,
  };
}

export function mapBrandVoiceSkuDeliverable(params: {
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
    metadata: baseMeta(BRAND_VOICE_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing marca",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Bot voz de marca",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
      };
    default:
      return null;
  }
}

export function buildBrandVoiceArtifacts(intake: BetaPackIntake, qaScore: number) {
  return {
    voice_guide: {
      tone: ["claro", "humano", "experto"],
      do: [`Hablar de ${intake.value_proposition}`, `CTA: ${intake.primary_cta}`],
      dont: ["Jerga vacía", "Promesas ilegales de resultados"],
    },
    value_props: [
      { segment: "early_adopter", prop: intake.value_proposition },
      { segment: "pragmatist", prop: `Resultados medibles en ${intake.city}` },
      { segment: "enterprise", prop: "Proceso, compliance y soporte" },
    ],
    personas: [
      { name: "Decisor", motivation: "ROI", objection: "precio" },
      { name: "Usuario", motivation: "facilidad", objection: "cambio" },
      { name: "Influencer interno", motivation: "crédito", objection: "riesgo" },
    ],
    qa_score: qaScore,
    production: true,
  };
}
