import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { CoachingInput } from "../../../../../../../backend/os-agents/sectors/coaching";
import {
  getCoachingAdsAgent,
  getCoachingCommunityAgent,
  getCoachingContentStrategyAgent,
  getCoachingLeadMagnetAgent,
  getCoachingLaunchEmailAgent,
  getCoachingPersonalBrandAgent,
  getCoachingSalesPageAgent,
  getCoachingTestimonialSystemAgent,
  getCoachingUpsellFunnelAgent,
  getCoachingWebinarAgent,
} from "../../../../../../../backend/os-agents/sectors/coaching";

type AgentId =
  | "coaching-personal-brand"
  | "coaching-launch-email"
  | "coaching-sales-page"
  | "coaching-webinar"
  | "coaching-content-strategy"
  | "coaching-lead-magnet"
  | "coaching-testimonial-system"
  | "coaching-ads"
  | "coaching-community"
  | "coaching-upsell-funnel";

const IDS: AgentId[] = [
  "coaching-personal-brand",
  "coaching-launch-email",
  "coaching-sales-page",
  "coaching-webinar",
  "coaching-content-strategy",
  "coaching-lead-magnet",
  "coaching-testimonial-system",
  "coaching-ads",
  "coaching-community",
  "coaching-upsell-funnel",
];

async function saveResult(userId: string, agentId: AgentId, input: CoachingInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO coaching_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: CoachingInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { expertName: "", niche: "otro", targetAudience: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "coaching-personal-brand": result = await getCoachingPersonalBrandAgent().run(user.userId, input); break;
      case "coaching-launch-email": result = await getCoachingLaunchEmailAgent().run(user.userId, input); break;
      case "coaching-sales-page": result = await getCoachingSalesPageAgent().run(user.userId, input); break;
      case "coaching-webinar": result = await getCoachingWebinarAgent().run(user.userId, input); break;
      case "coaching-content-strategy": result = await getCoachingContentStrategyAgent().run(user.userId, input); break;
      case "coaching-lead-magnet": result = await getCoachingLeadMagnetAgent().run(user.userId, input); break;
      case "coaching-testimonial-system": result = await getCoachingTestimonialSystemAgent().run(user.userId, input); break;
      case "coaching-ads": result = await getCoachingAdsAgent().run(user.userId, input); break;
      case "coaching-community": result = await getCoachingCommunityAgent().run(user.userId, input); break;
      case "coaching-upsell-funnel": result = await getCoachingUpsellFunnelAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
