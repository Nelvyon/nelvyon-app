import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { HomeInput } from "../../../../../../../backend/os-agents/sectors/home";
import {
  getHomeBeforeAfterContentAgent,
  getHomeBudgetEmailAgent,
  getHomeBusinessProfileAgent,
  getHomeClientRetentionAgent,
  getHomeLeadGenerationAgent,
  getHomeLocalSEOAgent,
  getHomeReviewSystemAgent,
  getHomeSeasonalCampaignAgent,
  getHomeUrgencyAdsAgent,
} from "../../../../../../../backend/os-agents/sectors/home";

type AgentId =
  | "home-business-profile"
  | "home-local-seo"
  | "home-lead-generation"
  | "home-review-system"
  | "home-before-after-content"
  | "home-urgency-ads"
  | "home-client-retention"
  | "home-budget-email"
  | "home-seasonal-campaign";

const IDS: AgentId[] = [
  "home-business-profile",
  "home-local-seo",
  "home-lead-generation",
  "home-review-system",
  "home-before-after-content",
  "home-urgency-ads",
  "home-client-retention",
  "home-budget-email",
  "home-seasonal-campaign",
];

async function saveResult(userId: string, agentId: AgentId, input: HomeInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO home_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: HomeInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", serviceType: "otro", targetArea: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "home-business-profile": result = await getHomeBusinessProfileAgent().run(user.userId, input); break;
      case "home-local-seo": result = await getHomeLocalSEOAgent().run(user.userId, input); break;
      case "home-lead-generation": result = await getHomeLeadGenerationAgent().run(user.userId, input); break;
      case "home-review-system": result = await getHomeReviewSystemAgent().run(user.userId, input); break;
      case "home-before-after-content": result = await getHomeBeforeAfterContentAgent().run(user.userId, input); break;
      case "home-urgency-ads": result = await getHomeUrgencyAdsAgent().run(user.userId, input); break;
      case "home-client-retention": result = await getHomeClientRetentionAgent().run(user.userId, input); break;
      case "home-budget-email": result = await getHomeBudgetEmailAgent().run(user.userId, input); break;
      case "home-seasonal-campaign": result = await getHomeSeasonalCampaignAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
