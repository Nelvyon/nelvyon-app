import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAccountBasedMarketingAgent,
  getB2BContentStrategyAgent,
  getB2BLeadGenAgent,
  getCaseStudyAgent,
  getCompetitiveBattlecardAgent,
  getCustomerSuccessEmailAgent,
  getDemoScriptAgent,
  getLinkedInOutreachAgent,
  getNurturingCampaignAgent,
  getProposalGeneratorAgent,
  getRFPResponseAgent,
  getSalesEmailSequenceAgent,
} from "../../../../../../../backend/os-agents/sectors/b2b";

type AgentId =
  | "b2b-lead-gen"
  | "linkedin-outreach"
  | "sales-email-sequence"
  | "proposal-generator"
  | "case-study"
  | "competitive-battlecard"
  | "account-based-marketing"
  | "demo-script"
  | "rfp-response"
  | "customer-success-email"
  | "nurturing-campaign"
  | "b2b-content-strategy";

const IDS: AgentId[] = [
  "b2b-lead-gen",
  "linkedin-outreach",
  "sales-email-sequence",
  "proposal-generator",
  "case-study",
  "competitive-battlecard",
  "account-based-marketing",
  "demo-script",
  "rfp-response",
  "customer-success-email",
  "nurturing-campaign",
  "b2b-content-strategy",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO b2b_results (user_id, agent_id, input, result) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
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
      case "b2b-lead-gen": result = await getB2BLeadGenAgent().generateLeads(user.userId, input as never); break;
      case "linkedin-outreach": result = await getLinkedInOutreachAgent().createSequence(user.userId, input as never); break;
      case "sales-email-sequence": result = await getSalesEmailSequenceAgent().generateSequence(user.userId, input as never); break;
      case "proposal-generator": result = await getProposalGeneratorAgent().generateProposal(user.userId, input as never); break;
      case "case-study": result = await getCaseStudyAgent().generateCaseStudy(user.userId, input as never); break;
      case "competitive-battlecard": result = await getCompetitiveBattlecardAgent().createBattlecard(user.userId, input as never); break;
      case "account-based-marketing": result = await getAccountBasedMarketingAgent().designAbmCampaign(user.userId, input as never); break;
      case "demo-script": result = await getDemoScriptAgent().createDemoScript(user.userId, input as never); break;
      case "rfp-response": result = await getRFPResponseAgent().generateRfpResponse(user.userId, input as never); break;
      case "customer-success-email": result = await getCustomerSuccessEmailAgent().createCustomerSuccessSequence(user.userId, input as never); break;
      case "nurturing-campaign": result = await getNurturingCampaignAgent().designNurturingCampaign(user.userId, input as never); break;
      case "b2b-content-strategy": result = await getB2BContentStrategyAgent().createContentStrategy(user.userId, input as never); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}

