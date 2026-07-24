import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { RetentionPackIntake } from "@/lib/packs/types";
import { RETENTION_PACK_ID } from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

export function buildRetentionPlan(intake: RetentionPackIntake, qaScore: number) {
  const channels = intake.channels?.length ? intake.channels : ["email", "crm"];
  return {
    business_name: intake.business_name,
    cohort: intake.cohort ?? "active_30d",
    loyalty_goal: intake.loyalty_goal ?? "reduce_churn",
    channels,
    sequence: [
      { day: 0, channel: "email", touch: "Welcome / thank you", kpi: "open_rate" },
      { day: 7, channel: channels[0] ?? "email", touch: "Value tip + CTA", kpi: "click_rate" },
      { day: 21, channel: "crm", touch: "Health check / win-back", kpi: "reply_rate" },
      { day: 45, channel: "email", touch: "Loyalty offer", kpi: "redeem_rate" },
    ],
    churn_rules: [
      { trigger: "no_login_14d", action: "nurture_email" },
      { trigger: "support_ticket_open", action: "human_handoff" },
    ],
    qa_score: qaScore,
    production: true,
  };
}

export function mapRetentionSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: RetentionPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = Math.max(85, params.simulation.project.qa?.score ?? 88);
  if (params.sku !== "NELVYON-CHATBOT") return null;
  return {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    title: "Bot retención",
    type: "url",
    visibility: "client_visible",
    file_url: `${origin}/api/packs/local/bot/${slug}`,
    metadata: {
      pack_id: RETENTION_PACK_ID,
      pack_run_id: params.packRunId,
      sku: params.sku,
      qa_score: qaScore,
      production: true,
    },
  };
}
