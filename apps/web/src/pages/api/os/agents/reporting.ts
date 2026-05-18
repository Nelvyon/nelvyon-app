import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ReportingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getReportingClientStoryAgent,
  getReportingCompetitiveContextAgent,
  getReportingExecutiveSummaryAgent,
  getReportingInsightExtractorAgent,
  getReportingKpiNarrativeAgent,
  getReportingNextStepsAgent,
  getReportingRecommendationAgent,
  getReportingVisualDescriptorAgent,
} from "../../../../../../../backend/os-agents/sectors/reporting";

type ReportingAgentId =
  | "reporting-executive-summary"
  | "reporting-kpi-narrative"
  | "reporting-insight-extractor"
  | "reporting-recommendation"
  | "reporting-competitive-context"
  | "reporting-visual-descriptor"
  | "reporting-client-story"
  | "reporting-next-steps";

const IDS: ReportingAgentId[] = [
  "reporting-executive-summary",
  "reporting-kpi-narrative",
  "reporting-insight-extractor",
  "reporting-recommendation",
  "reporting-competitive-context",
  "reporting-visual-descriptor",
  "reporting-client-story",
  "reporting-next-steps",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceReportingInput(userId: string, raw: unknown): ReportingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const clientName = typeof raw.clientName === "string" ? raw.clientName.trim() : "";
  const period = typeof raw.period === "string" ? raw.period.trim() : "";
  if (!sector || !clientName || !period) {
    throw new Error("sector, clientName y period son obligatorios");
  }
  if (!isRecord(raw.metrics)) throw new Error("metrics debe ser un objeto");
  const metrics: Record<string, string> = {};
  for (const [k, val] of Object.entries(raw.metrics)) {
    metrics[String(k)] = typeof val === "string" ? val : JSON.stringify(val);
  }
  const brandColor = typeof raw.brandColor === "string" ? raw.brandColor.trim() : undefined;
  return {
    userId,
    sector,
    clientName,
    period,
    metrics,
    brandColor: brandColor || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO reporting_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ReportingAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceReportingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ReportingAgentId) {
      case "reporting-executive-summary":
        result = await getReportingExecutiveSummaryAgent().run(input);
        break;
      case "reporting-kpi-narrative":
        result = await getReportingKpiNarrativeAgent().run(input);
        break;
      case "reporting-insight-extractor":
        result = await getReportingInsightExtractorAgent().run(input);
        break;
      case "reporting-recommendation":
        result = await getReportingRecommendationAgent().run(input);
        break;
      case "reporting-competitive-context":
        result = await getReportingCompetitiveContextAgent().run(input);
        break;
      case "reporting-visual-descriptor":
        result = await getReportingVisualDescriptorAgent().run(input);
        break;
      case "reporting-client-story":
        result = await getReportingClientStoryAgent().run(input);
        break;
      case "reporting-next-steps":
        result = await getReportingNextStepsAgent().run(input);
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
