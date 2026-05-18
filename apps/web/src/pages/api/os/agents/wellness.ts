import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { WellnessInput } from "../../../../../../../backend/os-agents/sectors/wellness";
import {
  getWellnessAdsAgent,
  getWellnessBusinessProfileAgent,
  getWellnessContentMarketingAgent,
  getWellnessCorporateWellnessAgent,
  getWellnessLeadGenerationAgent,
  getWellnessMembershipEmailAgent,
  getWellnessPersonalTrainingAgent,
  getWellnessRetentionAgent,
  getWellnessReviewSystemAgent,
  getWellnessSocialMediaAgent,
} from "../../../../../../../backend/os-agents/sectors/wellness";

type AgentId =
  | "wellness-business-profile"
  | "wellness-social-media"
  | "wellness-membership-email"
  | "wellness-lead-generation"
  | "wellness-content-marketing"
  | "wellness-retention"
  | "wellness-personal-training"
  | "wellness-ads"
  | "wellness-corporate-wellness"
  | "wellness-review-system";

const IDS: AgentId[] = [
  "wellness-business-profile",
  "wellness-social-media",
  "wellness-membership-email",
  "wellness-lead-generation",
  "wellness-content-marketing",
  "wellness-retention",
  "wellness-personal-training",
  "wellness-ads",
  "wellness-corporate-wellness",
  "wellness-review-system",
];

async function saveResult(userId: string, agentId: AgentId, input: WellnessInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO wellness_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: WellnessInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", serviceType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "wellness-business-profile": result = await getWellnessBusinessProfileAgent().run(user.userId, input); break;
      case "wellness-social-media": result = await getWellnessSocialMediaAgent().run(user.userId, input); break;
      case "wellness-membership-email": result = await getWellnessMembershipEmailAgent().run(user.userId, input); break;
      case "wellness-lead-generation": result = await getWellnessLeadGenerationAgent().run(user.userId, input); break;
      case "wellness-content-marketing": result = await getWellnessContentMarketingAgent().run(user.userId, input); break;
      case "wellness-retention": result = await getWellnessRetentionAgent().run(user.userId, input); break;
      case "wellness-personal-training": result = await getWellnessPersonalTrainingAgent().run(user.userId, input); break;
      case "wellness-ads": result = await getWellnessAdsAgent().run(user.userId, input); break;
      case "wellness-corporate-wellness": result = await getWellnessCorporateWellnessAgent().run(user.userId, input); break;
      case "wellness-review-system": result = await getWellnessReviewSystemAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
