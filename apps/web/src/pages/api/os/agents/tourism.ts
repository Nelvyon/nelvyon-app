import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { TourismInput } from "../../../../../../../backend/os-agents/sectors/tourism";
import {
  getTourismBusinessProfileAgent,
  getTourismContentMarketingAgent,
  getTourismDirectBookingAgent,
  getTourismEmailCampaignAgent,
  getTourismListingOptimizationAgent,
  getTourismPackageDescriptionAgent,
  getTourismReviewManagementAgent,
  getTourismSEOAgent,
  getTourismSeasonalCampaignAgent,
  getTourismSocialMediaAgent,
} from "../../../../../../../backend/os-agents/sectors/tourism";

type AgentId =
  | "tourism-business-profile"
  | "tourism-listing-optimization"
  | "tourism-content-marketing"
  | "tourism-seo"
  | "tourism-email-campaign"
  | "tourism-social-media"
  | "tourism-review-management"
  | "tourism-direct-booking"
  | "tourism-package-description"
  | "tourism-seasonal-campaign";

const IDS: AgentId[] = [
  "tourism-business-profile",
  "tourism-listing-optimization",
  "tourism-content-marketing",
  "tourism-seo",
  "tourism-email-campaign",
  "tourism-social-media",
  "tourism-review-management",
  "tourism-direct-booking",
  "tourism-package-description",
  "tourism-seasonal-campaign",
];

async function saveResult(userId: string, agentId: AgentId, input: TourismInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO tourism_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: TourismInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", businessType: "otro", targetTraveler: "familias", tone: "inspiracional" };
    let result;
    switch (agentId as AgentId) {
      case "tourism-business-profile":
        result = await getTourismBusinessProfileAgent().run(user.userId, input);
        break;
      case "tourism-listing-optimization":
        result = await getTourismListingOptimizationAgent().run(user.userId, input);
        break;
      case "tourism-content-marketing":
        result = await getTourismContentMarketingAgent().run(user.userId, input);
        break;
      case "tourism-seo":
        result = await getTourismSEOAgent().run(user.userId, input);
        break;
      case "tourism-email-campaign":
        result = await getTourismEmailCampaignAgent().run(user.userId, input);
        break;
      case "tourism-social-media":
        result = await getTourismSocialMediaAgent().run(user.userId, input);
        break;
      case "tourism-review-management":
        result = await getTourismReviewManagementAgent().run(user.userId, input);
        break;
      case "tourism-direct-booking":
        result = await getTourismDirectBookingAgent().run(user.userId, input);
        break;
      case "tourism-package-description":
        result = await getTourismPackageDescriptionAgent().run(user.userId, input);
        break;
      case "tourism-seasonal-campaign":
        result = await getTourismSeasonalCampaignAgent().run(user.userId, input);
        break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
