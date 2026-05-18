import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAudienceAnalysisAgent,
  getBioOptimizerAgent,
  getBrandDealNegotiatorAgent,
  getCaptionWriterAgent,
  getCollabPitchAgent,
  getCompetitorAnalysisAgent,
  getContentCalendarAgent,
  getHashtagStrategyAgent,
  getMonetizationPlanAgent,
  getReelIdeaAgent,
  getStoryScriptAgent,
  getViralHookAgent,
} from "../../../../../../../backend/os-agents/sectors/influencers";

type AgentId =
  | "content-calendar"
  | "caption-writer"
  | "hashtag-strategy"
  | "story-script"
  | "reel-idea"
  | "brand-deal-negotiator"
  | "audience-analysis"
  | "competitor-analysis"
  | "viral-hook"
  | "bio-optimizer"
  | "collab-pitch"
  | "monetization-plan";
const IDS: AgentId[] = [
  "content-calendar","caption-writer","hashtag-strategy","story-script","reel-idea","brand-deal-negotiator",
  "audience-analysis","competitor-analysis","viral-hook","bio-optimizer","collab-pitch","monetization-plan",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO influencers_results (user_id, agent_id, input, result) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
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
      case "content-calendar": result = await getContentCalendarAgent().generateCalendar(user.userId, input as never); break;
      case "caption-writer": result = await getCaptionWriterAgent().writeCaptions(user.userId, input as never); break;
      case "hashtag-strategy": result = await getHashtagStrategyAgent().generateStrategy(user.userId, input as never); break;
      case "story-script": result = await getStoryScriptAgent().generateStory(user.userId, input as never); break;
      case "reel-idea": result = await getReelIdeaAgent().generateReelIdeas(user.userId, input as never); break;
      case "brand-deal-negotiator": result = await getBrandDealNegotiatorAgent().negotiateDeal(user.userId, input as never); break;
      case "audience-analysis": result = await getAudienceAnalysisAgent().analyzeAudience(user.userId, input as never); break;
      case "competitor-analysis": result = await getCompetitorAnalysisAgent().analyzeCompetitors(user.userId, input as never); break;
      case "viral-hook": result = await getViralHookAgent().generateHooks(user.userId, input as never); break;
      case "bio-optimizer": result = await getBioOptimizerAgent().optimizeBio(user.userId, input as never); break;
      case "collab-pitch": result = await getCollabPitchAgent().generatePitch(user.userId, input as never); break;
      case "monetization-plan": result = await getMonetizationPlanAgent().createMonetizationPlan(user.userId, input as never); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}

