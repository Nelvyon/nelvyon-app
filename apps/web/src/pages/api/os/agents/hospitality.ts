import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getDeliveryOptimizationAgent,
  getEventPromotionAgent,
  getGoogleMyBusinessAgent,
  getInfluencerFoodAgent,
  getLoyaltyProgramAgent,
  getMenuCopywriterAgent,
  getReservationCampaignAgent,
  getReviewResponseAgent,
  getSeasonalMenuAgent,
  getSocialMenuAgent,
} from "../../../../../../../backend/os-agents/sectors/hospitality";

type AgentId =
  | "menu-copywriter"
  | "google-my-business"
  | "reservation-campaign"
  | "review-response"
  | "social-menu"
  | "event-promotion"
  | "delivery-optimization"
  | "loyalty-program"
  | "influencer-food"
  | "seasonal-menu";

const IDS: AgentId[] = [
  "menu-copywriter",
  "google-my-business",
  "reservation-campaign",
  "review-response",
  "social-menu",
  "event-promotion",
  "delivery-optimization",
  "loyalty-program",
  "influencer-food",
  "seasonal-menu",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO hospitality_results (user_id, agent_id, input, result) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
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
      case "menu-copywriter": result = await getMenuCopywriterAgent().generateMenuCopy(user.userId, input as never); break;
      case "google-my-business": result = await getGoogleMyBusinessAgent().optimizeGmb(user.userId, input as never); break;
      case "reservation-campaign": result = await getReservationCampaignAgent().createReservationCampaign(user.userId, input as never); break;
      case "review-response": result = await getReviewResponseAgent().generateResponse(user.userId, input as never); break;
      case "social-menu": result = await getSocialMenuAgent().createSocialMenuContent(user.userId, input as never); break;
      case "event-promotion": result = await getEventPromotionAgent().designEventPromotion(user.userId, input as never); break;
      case "delivery-optimization": result = await getDeliveryOptimizationAgent().optimizeDeliveryPresence(user.userId, input as never); break;
      case "loyalty-program": result = await getLoyaltyProgramAgent().designLoyaltyProgram(user.userId, input as never); break;
      case "influencer-food": result = await getInfluencerFoodAgent().generateInfluencerPlan(user.userId, input as never); break;
      case "seasonal-menu": result = await getSeasonalMenuAgent().launchSeasonalMenu(user.userId, input as never); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}

