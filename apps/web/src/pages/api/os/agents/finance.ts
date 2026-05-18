import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { FinanceInput } from "../../../../../../../backend/os-agents/sectors/finance";
import {
  getFinanceCompanyProfileAgent,
  getFinanceContentMarketingAgent,
  getFinanceEmailNurturingAgent,
  getFinanceLeadGenerationAgent,
  getFinanceReferralAgent,
  getFinanceRegulatoryContentAgent,
  getFinanceRetentionAgent,
  getFinanceSEOAgent,
  getFinanceThoughtLeadershipAgent,
  getFinanceTrustBuildingAgent,
} from "../../../../../../../backend/os-agents/sectors/finance";

type AgentId =
  | "finance-company-profile"
  | "finance-content-marketing"
  | "finance-seo"
  | "finance-lead-generation"
  | "finance-email-nurturing"
  | "finance-trust-building"
  | "finance-regulatory-content"
  | "finance-referral"
  | "finance-retention"
  | "finance-thought-leadership";

const IDS: AgentId[] = [
  "finance-company-profile",
  "finance-content-marketing",
  "finance-seo",
  "finance-lead-generation",
  "finance-email-nurturing",
  "finance-trust-building",
  "finance-regulatory-content",
  "finance-referral",
  "finance-retention",
  "finance-thought-leadership",
];

async function saveResult(userId: string, agentId: AgentId, input: FinanceInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO finance_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: FinanceInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { companyName: "", serviceType: "otro", targetClient: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "finance-company-profile": result = await getFinanceCompanyProfileAgent().run(user.userId, input); break;
      case "finance-content-marketing": result = await getFinanceContentMarketingAgent().run(user.userId, input); break;
      case "finance-seo": result = await getFinanceSEOAgent().run(user.userId, input); break;
      case "finance-lead-generation": result = await getFinanceLeadGenerationAgent().run(user.userId, input); break;
      case "finance-email-nurturing": result = await getFinanceEmailNurturingAgent().run(user.userId, input); break;
      case "finance-trust-building": result = await getFinanceTrustBuildingAgent().run(user.userId, input); break;
      case "finance-regulatory-content": result = await getFinanceRegulatoryContentAgent().run(user.userId, input); break;
      case "finance-referral": result = await getFinanceReferralAgent().run(user.userId, input); break;
      case "finance-retention": result = await getFinanceRetentionAgent().run(user.userId, input); break;
      case "finance-thought-leadership": result = await getFinanceThoughtLeadershipAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
