import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAthletePersonalBrandAgent,
  getClubCommunityAgent,
  getEsportsHighlightAgent,
  getFanEngagementAgent,
  getMatchDayContentAgent,
  getMerchandisingAgent,
  getPerformanceReportAgent,
  getSponsorshipDeckAgent,
  getTrainingContentAgent,
  getTransferNewsAgent,
} from "../../../../../../../backend/os-agents/sectors/sports";

type AgentId =
  | "athlete-personal-brand"
  | "match-day-content"
  | "sponsorship-deck"
  | "esports-highlight"
  | "fan-engagement"
  | "transfer-news"
  | "merchandising"
  | "training-content"
  | "club-community"
  | "performance-report";

const IDS: AgentId[] = [
  "athlete-personal-brand",
  "match-day-content",
  "sponsorship-deck",
  "esports-highlight",
  "fan-engagement",
  "transfer-news",
  "merchandising",
  "training-content",
  "club-community",
  "performance-report",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO sports_results (user_id, agent_id, input, result) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
    [userId, agentId, JSON.stringify(input ?? {}), JSON.stringify(result ?? {})],
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
    if (!IDS.includes(agentId as AgentId)) return res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? {};
    let result: unknown;
    switch (agentId as AgentId) {
      case "athlete-personal-brand": result = await getAthletePersonalBrandAgent().buildBrand(user.userId, input as never); break;
      case "match-day-content": result = await getMatchDayContentAgent().generateMatchDayContent(user.userId, input as never); break;
      case "sponsorship-deck": result = await getSponsorshipDeckAgent().createDeck(user.userId, input as never); break;
      case "esports-highlight": result = await getEsportsHighlightAgent().generateHighlights(user.userId, input as never); break;
      case "fan-engagement": result = await getFanEngagementAgent().createEngagementPlan(user.userId, input as never); break;
      case "transfer-news": result = await getTransferNewsAgent().generateTransferComms(user.userId, input as never); break;
      case "merchandising": result = await getMerchandisingAgent().generateMerchPlan(user.userId, input as never); break;
      case "training-content": result = await getTrainingContentAgent().createTrainingContent(user.userId, input as never); break;
      case "club-community": result = await getClubCommunityAgent().manageCommunity(user.userId, input as never); break;
      case "performance-report": result = await getPerformanceReportAgent().generateReport(user.userId, input as never); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}

