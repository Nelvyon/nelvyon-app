import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { BuildInput } from "../../../../../../../backend/os-agents/sectors/construction";
import {
  getBuildAdsAgent,
  getBuildBudgetConversionAgent,
  getBuildCompanyProfileAgent,
  getBuildContentMarketingAgent,
  getBuildLeadGenerationAgent,
  getBuildProjectDescriptionAgent,
  getBuildReferralNetworkAgent,
  getBuildReviewSystemAgent,
  getBuildSEOLocalAgent,
} from "../../../../../../../backend/os-agents/sectors/construction";

type AgentId =
  | "build-company-profile"
  | "build-project-description"
  | "build-lead-generation"
  | "build-content-marketing"
  | "build-budget-conversion"
  | "build-seo-local"
  | "build-ads"
  | "build-review-system"
  | "build-referral-network";

const IDS: AgentId[] = [
  "build-company-profile",
  "build-project-description",
  "build-lead-generation",
  "build-content-marketing",
  "build-budget-conversion",
  "build-seo-local",
  "build-ads",
  "build-review-system",
  "build-referral-network",
];

async function saveResult(userId: string, agentId: AgentId, input: BuildInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO construction_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: BuildInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", serviceType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "build-company-profile":
        result = await getBuildCompanyProfileAgent().run(user.userId, input);
        break;
      case "build-project-description":
        result = await getBuildProjectDescriptionAgent().run(user.userId, input);
        break;
      case "build-lead-generation":
        result = await getBuildLeadGenerationAgent().run(user.userId, input);
        break;
      case "build-content-marketing":
        result = await getBuildContentMarketingAgent().run(user.userId, input);
        break;
      case "build-budget-conversion":
        result = await getBuildBudgetConversionAgent().run(user.userId, input);
        break;
      case "build-seo-local":
        result = await getBuildSEOLocalAgent().run(user.userId, input);
        break;
      case "build-ads":
        result = await getBuildAdsAgent().run(user.userId, input);
        break;
      case "build-review-system":
        result = await getBuildReviewSystemAgent().run(user.userId, input);
        break;
      case "build-referral-network":
        result = await getBuildReferralNetworkAgent().run(user.userId, input);
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
