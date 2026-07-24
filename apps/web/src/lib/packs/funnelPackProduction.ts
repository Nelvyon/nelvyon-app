import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { FunnelGrowthPackIntake } from "@/lib/packs/types";
import { FUNNEL_GROWTH_PACK_ID } from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

export function buildFunnelMap(intake: FunnelGrowthPackIntake, qaScore: number) {
  const steps = Math.max(3, intake.funnel_steps ?? 3);
  const labels = ["Awareness", "Consideration", "Conversion", "Upsell", "Referral"];
  return {
    business_name: intake.business_name,
    offer: intake.offer ?? intake.value_proposition,
    primary_cta: intake.primary_cta,
    steps: Array.from({ length: steps }, (_, i) => ({
      step: i + 1,
      name: labels[i] ?? `Step ${i + 1}`,
      copy: `${intake.primary_cta} — ${intake.value_proposition}`.slice(0, 160),
      event: `funnel_step_${i + 1}`,
    })),
    tracking_events: Array.from({ length: steps }, (_, i) => `funnel_step_${i + 1}`),
    qa_score: qaScore,
    production: true,
  };
}

export function mapFunnelSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: FunnelGrowthPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = Math.max(85, params.simulation.project.qa?.score ?? 88);
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: {
      pack_id: FUNNEL_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      production: true,
    },
  };
  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing funnel",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
        metadata: { ...base.metadata, sku: params.sku, qa_score: qaScore },
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Informe CRO funnel",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: { ...base.metadata, sku: params.sku, qa_score: qaScore, report_type: "funnel_cro" },
      };
    default:
      return null;
  }
}
