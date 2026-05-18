import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ScalingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getScalingAnnualConversionAgent,
  getScalingDowngradeRiskAgent,
  getScalingExpansionRevenueAgent,
  getScalingFrictionReducerAgent,
  getScalingPricingAnchorAgent,
  getScalingTimingOptimizerAgent,
  getScalingUpgradeProposerAgent,
  getScalingUsageAnalyzerAgent,
} from "../../../../../../../backend/os-agents/sectors/scaling";

type ScalingLibraryAgentId =
  | "scaling-usage-analyzer"
  | "scaling-upgrade-proposer"
  | "scaling-pricing-anchor"
  | "scaling-friction-reducer"
  | "scaling-timing-optimizer"
  | "scaling-downgrade-risk"
  | "scaling-annual-conversion"
  | "scaling-expansion-revenue";

const IDS: ScalingLibraryAgentId[] = [
  "scaling-usage-analyzer",
  "scaling-upgrade-proposer",
  "scaling-pricing-anchor",
  "scaling-friction-reducer",
  "scaling-timing-optimizer",
  "scaling-downgrade-risk",
  "scaling-annual-conversion",
  "scaling-expansion-revenue",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceUsageMetrics(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function coerceScalingInput(userId: string, raw: unknown): ScalingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const currentPlan = typeof raw.currentPlan === "string" ? raw.currentPlan.trim() : "";
  if (!sector || !currentPlan) {
    throw new Error("sector y currentPlan son obligatorios");
  }
  const usageMetrics = coerceUsageMetrics(raw.usageMetrics);
  let monthsActive: number | undefined;
  if (typeof raw.monthsActive === "number" && Number.isFinite(raw.monthsActive)) {
    monthsActive = raw.monthsActive;
  } else if (typeof raw.monthsActive === "string" && raw.monthsActive.trim()) {
    const n = Number(raw.monthsActive.trim());
    if (Number.isFinite(n)) monthsActive = n;
  }
  const mrr = typeof raw.mrr === "string" ? raw.mrr.trim() : undefined;
  return {
    userId,
    sector,
    currentPlan,
    usageMetrics,
    monthsActive,
    mrr: mrr || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO scaling_results (user_id, agent_id, sector, input, output)
     VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)`,
    [userId, agentId, sector, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { agentId?: string; input?: unknown } | undefined;
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";
    if (!IDS.includes(agentId as ScalingLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceScalingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ScalingLibraryAgentId) {
      case "scaling-usage-analyzer":
        result = await getScalingUsageAnalyzerAgent().run(input);
        break;
      case "scaling-upgrade-proposer":
        result = await getScalingUpgradeProposerAgent().run(input);
        break;
      case "scaling-pricing-anchor":
        result = await getScalingPricingAnchorAgent().run(input);
        break;
      case "scaling-friction-reducer":
        result = await getScalingFrictionReducerAgent().run(input);
        break;
      case "scaling-timing-optimizer":
        result = await getScalingTimingOptimizerAgent().run(input);
        break;
      case "scaling-downgrade-risk":
        result = await getScalingDowngradeRiskAgent().run(input);
        break;
      case "scaling-annual-conversion":
        result = await getScalingAnnualConversionAgent().run(input);
        break;
      case "scaling-expansion-revenue":
        result = await getScalingExpansionRevenueAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input.sector, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorios") ||
        e.message.includes("debe ser");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
