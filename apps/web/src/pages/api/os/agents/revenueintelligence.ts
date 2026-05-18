import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { RevenueIntelligenceInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getCallCoachingAgent,
  getCallTranscriptionAgent,
  getCompetitorMentionAgent,
  getDealRiskAgent,
  getNextStepAgent,
  getRevenueForecasterAgent,
  getTalkRatioAgent,
  getWinLossAgent,
} from "../../../../../../../backend/os-agents/sectors/revenueintelligence";

type RevenueIntelligenceLibraryAgentId =
  | "revenueintelligence-calltranscription"
  | "revenueintelligence-dealrisk"
  | "revenueintelligence-winloss"
  | "revenueintelligence-callcoaching"
  | "revenueintelligence-revenueforecaster"
  | "revenueintelligence-competitormention"
  | "revenueintelligence-talkratio"
  | "revenueintelligence-nextstep";

const IDS: RevenueIntelligenceLibraryAgentId[] = [
  "revenueintelligence-calltranscription",
  "revenueintelligence-dealrisk",
  "revenueintelligence-winloss",
  "revenueintelligence-callcoaching",
  "revenueintelligence-revenueforecaster",
  "revenueintelligence-competitormention",
  "revenueintelligence-talkratio",
  "revenueintelligence-nextstep",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceRevenueIntelligenceInput(userId: string, raw: unknown): RevenueIntelligenceInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const revenueIntelligenceBrief =
    typeof raw.revenueIntelligenceBrief === "string" ? raw.revenueIntelligenceBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    revenueIntelligenceBrief: revenueIntelligenceBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO revenueintelligence_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as RevenueIntelligenceLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceRevenueIntelligenceInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as RevenueIntelligenceLibraryAgentId) {
      case "revenueintelligence-calltranscription":
        result = await getCallTranscriptionAgent().run(input);
        break;
      case "revenueintelligence-dealrisk":
        result = await getDealRiskAgent().run(input);
        break;
      case "revenueintelligence-winloss":
        result = await getWinLossAgent().run(input);
        break;
      case "revenueintelligence-callcoaching":
        result = await getCallCoachingAgent().run(input);
        break;
      case "revenueintelligence-revenueforecaster":
        result = await getRevenueForecasterAgent().run(input);
        break;
      case "revenueintelligence-competitormention":
        result = await getCompetitorMentionAgent().run(input);
        break;
      case "revenueintelligence-talkratio":
        result = await getTalkRatioAgent().run(input);
        break;
      case "revenueintelligence-nextstep":
        result = await getNextStepAgent().run(input);
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
