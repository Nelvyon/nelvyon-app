import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { LogisticsInput } from "../../../../../../../backend/os-agents/sectors/logistics";
import {
  getLogisticsAdsAgent,
  getLogisticsB2BLeadGenAgent,
  getLogisticsCompanyProfileAgent,
  getLogisticsContentMarketingAgent,
  getLogisticsEcommerceAgent,
  getLogisticsRetentionAgent,
  getLogisticsReviewSystemAgent,
  getLogisticsSEOAgent,
} from "../../../../../../../backend/os-agents/sectors/logistics";

type AgentId =
  | "logistics-company-profile"
  | "logistics-b2b-lead-gen"
  | "logistics-ecommerce"
  | "logistics-content-marketing"
  | "logistics-seo"
  | "logistics-retention"
  | "logistics-ads"
  | "logistics-review-system";

const IDS: AgentId[] = [
  "logistics-company-profile",
  "logistics-b2b-lead-gen",
  "logistics-ecommerce",
  "logistics-content-marketing",
  "logistics-seo",
  "logistics-retention",
  "logistics-ads",
  "logistics-review-system",
];

async function saveResult(userId: string, agentId: AgentId, input: LogisticsInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO logistics_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: LogisticsInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", serviceType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "logistics-company-profile":
        result = await getLogisticsCompanyProfileAgent().run(user.userId, input);
        break;
      case "logistics-b2b-lead-gen":
        result = await getLogisticsB2BLeadGenAgent().run(user.userId, input);
        break;
      case "logistics-ecommerce":
        result = await getLogisticsEcommerceAgent().run(user.userId, input);
        break;
      case "logistics-content-marketing":
        result = await getLogisticsContentMarketingAgent().run(user.userId, input);
        break;
      case "logistics-seo":
        result = await getLogisticsSEOAgent().run(user.userId, input);
        break;
      case "logistics-retention":
        result = await getLogisticsRetentionAgent().run(user.userId, input);
        break;
      case "logistics-ads":
        result = await getLogisticsAdsAgent().run(user.userId, input);
        break;
      case "logistics-review-system":
        result = await getLogisticsReviewSystemAgent().run(user.userId, input);
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
