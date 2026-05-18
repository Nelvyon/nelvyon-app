import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ComparatorInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getComparatorBenchmarkAgent,
  getComparatorMetricsNarratorAgent,
  getComparatorPDFSummaryAgent,
  getComparatorROICalculatorAgent,
  getComparatorSocialShareAgent,
  getComparatorTestimonialMinerAgent,
  getComparatorUpsellTriggerAgent,
  getComparatorVisualStoryAgent,
} from "../../../../../../../backend/os-agents/sectors/comparator";

type ComparatorLibraryAgentId =
  | "comparator-metrics-narrator"
  | "comparator-roi-calculator"
  | "comparator-visual-story"
  | "comparator-benchmark"
  | "comparator-social-share"
  | "comparator-pdf-summary"
  | "comparator-upsell-trigger"
  | "comparator-testimonial-miner";

const IDS: ComparatorLibraryAgentId[] = [
  "comparator-metrics-narrator",
  "comparator-roi-calculator",
  "comparator-visual-story",
  "comparator-benchmark",
  "comparator-social-share",
  "comparator-pdf-summary",
  "comparator-upsell-trigger",
  "comparator-testimonial-miner",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringRecord(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function coerceComparatorInput(userId: string, bodyInput: unknown): ComparatorInput {
  if (!isRecord(bodyInput)) throw new Error("input inválido");
  const sector = typeof bodyInput.sector === "string" ? bodyInput.sector.trim() : "";
  const clientName = typeof bodyInput.clientName === "string" ? bodyInput.clientName.trim() : "";
  const beforeMetrics = coerceStringRecord(bodyInput.beforeMetrics);
  const afterMetrics = coerceStringRecord(bodyInput.afterMetrics);
  const period = typeof bodyInput.period === "string" ? bodyInput.period.trim() : undefined;
  if (!sector || !clientName) throw new Error("sector y clientName son obligatorios");
  if (Object.keys(beforeMetrics).length === 0 || Object.keys(afterMetrics).length === 0) {
    throw new Error("beforeMetrics y afterMetrics deben incluir al menos una métrica cada uno");
  }
  return {
    userId,
    sector,
    clientName,
    beforeMetrics,
    afterMetrics,
    period: period || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO comparator_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ComparatorLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceComparatorInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ComparatorLibraryAgentId) {
      case "comparator-metrics-narrator":
        result = await getComparatorMetricsNarratorAgent().run(input);
        break;
      case "comparator-roi-calculator":
        result = await getComparatorROICalculatorAgent().run(input);
        break;
      case "comparator-visual-story":
        result = await getComparatorVisualStoryAgent().run(input);
        break;
      case "comparator-benchmark":
        result = await getComparatorBenchmarkAgent().run(input);
        break;
      case "comparator-social-share":
        result = await getComparatorSocialShareAgent().run(input);
        break;
      case "comparator-pdf-summary":
        result = await getComparatorPDFSummaryAgent().run(input);
        break;
      case "comparator-upsell-trigger":
        result = await getComparatorUpsellTriggerAgent().run(input);
        break;
      case "comparator-testimonial-miner":
        result = await getComparatorTestimonialMinerAgent().run(input);
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
        e.message.includes("deben incluir");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
