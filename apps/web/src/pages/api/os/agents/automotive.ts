import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { AutoInput } from "../../../../../../../backend/os-agents/sectors/automotive";
import {
  getAutoAdsAgent,
  getAutoBusinessProfileAgent,
  getAutoContentStrategyAgent,
  getAutoEmailCampaignAgent,
  getAutoLocalSEOAgent,
  getAutoReferralAgent,
  getAutoReviewSystemAgent,
  getAutoSeasonalCampaignAgent,
  getAutoVehicleDescriptionAgent,
} from "../../../../../../../backend/os-agents/sectors/automotive";

type AgentId =
  | "auto-business-profile"
  | "auto-vehicle-description"
  | "auto-local-seo"
  | "auto-ads"
  | "auto-email-campaign"
  | "auto-review-system"
  | "auto-content-strategy"
  | "auto-referral"
  | "auto-seasonal-campaign";

const IDS: AgentId[] = [
  "auto-business-profile",
  "auto-vehicle-description",
  "auto-local-seo",
  "auto-ads",
  "auto-email-campaign",
  "auto-review-system",
  "auto-content-strategy",
  "auto-referral",
  "auto-seasonal-campaign",
];

async function saveResult(userId: string, agentId: AgentId, input: AutoInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO automotive_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: AutoInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", businessType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "auto-business-profile": result = await getAutoBusinessProfileAgent().run(user.userId, input); break;
      case "auto-vehicle-description": result = await getAutoVehicleDescriptionAgent().run(user.userId, input); break;
      case "auto-local-seo": result = await getAutoLocalSEOAgent().run(user.userId, input); break;
      case "auto-ads": result = await getAutoAdsAgent().run(user.userId, input); break;
      case "auto-email-campaign": result = await getAutoEmailCampaignAgent().run(user.userId, input); break;
      case "auto-review-system": result = await getAutoReviewSystemAgent().run(user.userId, input); break;
      case "auto-content-strategy": result = await getAutoContentStrategyAgent().run(user.userId, input); break;
      case "auto-referral": result = await getAutoReferralAgent().run(user.userId, input); break;
      case "auto-seasonal-campaign": result = await getAutoSeasonalCampaignAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
