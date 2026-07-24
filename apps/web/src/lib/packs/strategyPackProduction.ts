import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { StrategyPackIntake } from "@/lib/packs/types";
import { STRATEGY_PACK_ID } from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

export function buildStrategy90dPlan(intake: StrategyPackIntake, qaScore: number) {
  const goals = intake.goals?.length ? intake.goals : ["leads", "revenue"];
  const horizon = intake.horizon_days ?? 90;
  return {
    horizon_days: horizon,
    business_name: intake.business_name,
    sector: intake.sector,
    city: intake.city,
    goals,
    okrs: goals.map((g, i) => ({
      objective: g,
      key_results: [
        `KR1: medir ${g} a día ${Math.round(horizon / 3)}`,
        `KR2: mejorar ${g} ≥15% vs baseline a día ${horizon}`,
      ],
      priority: i + 1,
    })),
    milestones: [
      { day: 14, title: "Brief + baseline KPI", packs: ["strategy-pack"] },
      { day: 30, title: "Landing + SEO base", packs: ["local-business-growth", "ecommerce-growth"] },
      { day: 60, title: "Funnel CRO + nurture", packs: ["funnel-growth-pack", "saas-b2b-growth"] },
      { day: horizon, title: "Retention + reporting", packs: ["retention-pack"] },
    ],
    suggested_packs: ["local-business-growth", "ecommerce-growth", "saas-b2b-growth", "funnel-growth-pack"],
    risks: [
      { risk: "Sin datos baseline", mitigation: "Setup analytics antes de ads" },
      { risk: "Scope creep packs", mitigation: "Priorizar 1 growth pack/mes" },
    ],
    qa_score: qaScore,
    production: true,
  };
}

export function mapStrategySkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: StrategyPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = Math.max(85, params.simulation.project.qa?.score ?? 88);
  if (params.sku !== "NELVYON-LANDING") return null;
  return {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    title: "Landing estrategia",
    type: "url",
    visibility: "client_visible",
    file_url: `${origin}/api/packs/local/live/${slug}`,
    metadata: {
      pack_id: STRATEGY_PACK_ID,
      pack_run_id: params.packRunId,
      sku: params.sku,
      qa_score: qaScore,
      production: true,
    },
  };
}
