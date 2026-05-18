import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { AgroInput } from "../../../../../../../backend/os-agents/sectors/agrofood";
import {
  getAgroB2BOutreachAgent,
  getAgroBrandStoryAgent,
  getAgroDigitalMarketingAgent,
  getAgroExportAgent,
  getAgroProductDescriptionAgent,
  getAgroRetailPresenceAgent,
  getAgroSeasonalCampaignAgent,
  getAgroSustainabilityContentAgent,
} from "../../../../../../../backend/os-agents/sectors/agrofood";

type AgentId =
  | "agro-product-description"
  | "agro-brand-story"
  | "agro-b2b-outreach"
  | "agro-digital-marketing"
  | "agro-export"
  | "agro-sustainability-content"
  | "agro-seasonal-campaign"
  | "agro-retail-presence";

const IDS: AgentId[] = [
  "agro-product-description",
  "agro-brand-story",
  "agro-b2b-outreach",
  "agro-digital-marketing",
  "agro-export",
  "agro-sustainability-content",
  "agro-seasonal-campaign",
  "agro-retail-presence",
];

async function saveResult(userId: string, agentId: AgentId, input: AgroInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO agrofood_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: AgroInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", productType: "otro", targetMarket: "b2c-directo", tone: "artesanal" };
    let result;
    switch (agentId as AgentId) {
      case "agro-product-description":
        result = await getAgroProductDescriptionAgent().run(user.userId, input);
        break;
      case "agro-brand-story":
        result = await getAgroBrandStoryAgent().run(user.userId, input);
        break;
      case "agro-b2b-outreach":
        result = await getAgroB2BOutreachAgent().run(user.userId, input);
        break;
      case "agro-digital-marketing":
        result = await getAgroDigitalMarketingAgent().run(user.userId, input);
        break;
      case "agro-export":
        result = await getAgroExportAgent().run(user.userId, input);
        break;
      case "agro-sustainability-content":
        result = await getAgroSustainabilityContentAgent().run(user.userId, input);
        break;
      case "agro-seasonal-campaign":
        result = await getAgroSeasonalCampaignAgent().run(user.userId, input);
        break;
      case "agro-retail-presence":
        result = await getAgroRetailPresenceAgent().run(user.userId, input);
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
