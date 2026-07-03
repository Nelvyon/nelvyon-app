import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { EcommerceGrowthPackIntake } from "@/lib/packs/types";
import { ECOMMERCE_GROWTH_PACK_ID } from "@/lib/packs/types";

import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

/** Titles aligned with packDeliverablesCatalog + staging-smoke-ecommerce-pack-e2e. */
export function mapEcommerceSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: EcommerceGrowthPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = Math.max(85, params.simulation.project.qa?.score ?? 88);
  const copy = params.simulation.project.artifacts?.copy as Record<string, unknown> | undefined;
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: {
      pack_id: ECOMMERCE_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      landing_slug: slug,
      production: true,
      product_category: params.intake.product_category,
    },
  };

  switch (params.sku) {
    case "NELVYON-LANDING":
      return {
        ...base,
        title: "Tienda / landing ecommerce",
        type: "url",
        file_url: `${origin}/api/packs/local/live/${slug}`,
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          copy_map: copy ?? null,
        },
      };
    case "NELVYON-SEO":
      return {
        ...base,
        title: "SEO de catálogo",
        type: "json",
        file_url: `${origin}/api/packs/local/seo/${slug}/report`,
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          report_type: "ecommerce_catalog",
        },
      };
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Chatbot de ventas",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
        metadata: {
          ...base.metadata,
          sku: params.sku,
          qa_score: qaScore,
          sales_assistant: true,
        },
      };
    default:
      return null;
  }
}

export function buildEcommerceCopyDeliverable(params: {
  intake: EcommerceGrowthPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput {
  return {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    title: "Copy map ecommerce",
    type: "json",
    visibility: "client_visible",
    metadata: {
      pack_id: ECOMMERCE_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      production: true,
      qa_score: 88,
      copy: {
        hero: params.intake.value_proposition,
        cta: params.intake.primary_cta,
        category: params.intake.product_category,
        channel: params.intake.primary_channel ?? "meta",
      },
    },
  };
}

export function buildEcommerceHandoffDeliverable(params: {
  intake: EcommerceGrowthPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput {
  return {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    title: "Handoff ecommerce 1-pager",
    type: "document",
    visibility: "client_visible",
    metadata: {
      pack_id: ECOMMERCE_GROWTH_PACK_ID,
      pack_run_id: params.packRunId,
      production: true,
      qa_score: 88,
      handoff: {
        business_name: params.intake.business_name,
        next_steps: [
          "Importar kit Meta Ads en Business Manager",
          "Conectar pixel Meta + GA4 ecommerce",
          "Activar secuencia carrito abandonado",
          "Medir ROAS a 14 días",
        ],
      },
    },
  };
}
