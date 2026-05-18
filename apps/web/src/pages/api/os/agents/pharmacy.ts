import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { PharmacyInput } from "../../../../../../../backend/os-agents/sectors/pharmacy";
import {
  getPharmacyContentMarketingAgent,
  getPharmacyEmailCampaignAgent,
  getPharmacyLocalSEOAgent,
  getPharmacyLoyaltyProgramAgent,
  getPharmacyProfileAgent,
  getPharmacyReviewSystemAgent,
  getPharmacySeasonalCampaignAgent,
  getPharmacyWhatsAppStrategyAgent,
} from "../../../../../../../backend/os-agents/sectors/pharmacy";

type AgentId =
  | "pharmacy-profile"
  | "pharmacy-content-marketing"
  | "pharmacy-local-seo"
  | "pharmacy-seasonal-campaign"
  | "pharmacy-email-campaign"
  | "pharmacy-whatsapp-strategy"
  | "pharmacy-loyalty-program"
  | "pharmacy-review-system";

const IDS: AgentId[] = [
  "pharmacy-profile",
  "pharmacy-content-marketing",
  "pharmacy-local-seo",
  "pharmacy-seasonal-campaign",
  "pharmacy-email-campaign",
  "pharmacy-whatsapp-strategy",
  "pharmacy-loyalty-program",
  "pharmacy-review-system",
];

async function saveResult(userId: string, agentId: AgentId, input: PharmacyInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO pharmacy_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: PharmacyInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", businessType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "pharmacy-profile": result = await getPharmacyProfileAgent().run(user.userId, input); break;
      case "pharmacy-content-marketing": result = await getPharmacyContentMarketingAgent().run(user.userId, input); break;
      case "pharmacy-local-seo": result = await getPharmacyLocalSEOAgent().run(user.userId, input); break;
      case "pharmacy-seasonal-campaign": result = await getPharmacySeasonalCampaignAgent().run(user.userId, input); break;
      case "pharmacy-email-campaign": result = await getPharmacyEmailCampaignAgent().run(user.userId, input); break;
      case "pharmacy-whatsapp-strategy": result = await getPharmacyWhatsAppStrategyAgent().run(user.userId, input); break;
      case "pharmacy-loyalty-program": result = await getPharmacyLoyaltyProgramAgent().run(user.userId, input); break;
      case "pharmacy-review-system": result = await getPharmacyReviewSystemAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
