import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { FashionInput } from "../../../../../../../backend/os-agents/sectors/fashion";
import {
  getFashionBrandStoryAgent,
  getFashionEmailCampaignAgent,
  getFashionInfluencerBriefAgent,
  getFashionInstagramAgent,
  getFashionLookbookCopyAgent,
  getFashionProductDescriptionAgent,
  getFashionRetentionAgent,
  getFashionSeasonalCampaignAgent,
  getFashionSEOAgent,
  getFashionUGCStrategyAgent,
} from "../../../../../../../backend/os-agents/sectors/fashion";

type AgentId =
  | "fashion-brand-story"
  | "fashion-product-description"
  | "fashion-instagram"
  | "fashion-influencer-brief"
  | "fashion-email-campaign"
  | "fashion-lookbook-copy"
  | "fashion-seo"
  | "fashion-ugc-strategy"
  | "fashion-seasonal-campaign"
  | "fashion-retention";

const IDS: AgentId[] = [
  "fashion-brand-story",
  "fashion-product-description",
  "fashion-instagram",
  "fashion-influencer-brief",
  "fashion-email-campaign",
  "fashion-lookbook-copy",
  "fashion-seo",
  "fashion-ugc-strategy",
  "fashion-seasonal-campaign",
  "fashion-retention",
];

async function saveResult(userId: string, agentId: AgentId, input: FashionInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO fashion_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: FashionInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { brandName: "", category: "lifestyle", targetAudience: "", priceRange: "mid-range", tone: "editorial", season: "atemporal" };

    let result;
    switch (agentId as AgentId) {
      case "fashion-brand-story": result = await getFashionBrandStoryAgent().run(user.userId, input); break;
      case "fashion-product-description": result = await getFashionProductDescriptionAgent().run(user.userId, input); break;
      case "fashion-instagram": result = await getFashionInstagramAgent().run(user.userId, input); break;
      case "fashion-influencer-brief": result = await getFashionInfluencerBriefAgent().run(user.userId, input); break;
      case "fashion-email-campaign": result = await getFashionEmailCampaignAgent().run(user.userId, input); break;
      case "fashion-lookbook-copy": result = await getFashionLookbookCopyAgent().run(user.userId, input); break;
      case "fashion-seo": result = await getFashionSEOAgent().run(user.userId, input); break;
      case "fashion-ugc-strategy": result = await getFashionUGCStrategyAgent().run(user.userId, input); break;
      case "fashion-seasonal-campaign": result = await getFashionSeasonalCampaignAgent().run(user.userId, input); break;
      case "fashion-retention": result = await getFashionRetentionAgent().run(user.userId, input); break;
    }

    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}

