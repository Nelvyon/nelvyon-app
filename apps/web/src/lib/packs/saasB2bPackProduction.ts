import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { SaasB2bGrowthPackIntake } from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

/** Titles aligned with staging-smoke-saas-b2b-pack-e2e EXPECTED_TITLES */
export function mapSaasB2bSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: SaasB2bGrowthPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = params.simulation.project.qa?.score ?? 88;
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: {
      pack_id: SAAS_B2B_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      landing_slug: slug,
      production: true,
      icp_title: params.intake.icp_title,
    },
  };

  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Landing PLG",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
        metadata: { ...base.metadata, sku: params.sku, qa_score: qaScore },
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "Informe SEO B2B",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          report_type: "b2b_demand_gen",
        },
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Bot demo",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          demo_qualification: true,
        },
      };
    default:
      return null;
  }
}
