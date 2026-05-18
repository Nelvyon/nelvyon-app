import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { FreelancerInput } from "../../../../../../../backend/os-agents/sectors/freelancers";
import {
  getClientProposalAgent,
  getFreelancerEmailSequenceAgent,
  getLinkedInOptimizationAgent,
  getNicheContentAgent,
  getPersonalBrandingAgent,
  getPortfolioDescriptionAgent,
  getRateJustificationAgent,
  getReferralSystemAgent,
  getTestimonialRequestAgent,
} from "../../../../../../../backend/os-agents/sectors/freelancers";

type AgentId =
  | "personal-branding"
  | "linkedin-optimization"
  | "portfolio-description"
  | "rate-justification"
  | "client-proposal"
  | "testimonial-request"
  | "niche-content"
  | "referral-system"
  | "freelancer-email-sequence";

const IDS: AgentId[] = [
  "personal-branding",
  "linkedin-optimization",
  "portfolio-description",
  "rate-justification",
  "client-proposal",
  "testimonial-request",
  "niche-content",
  "referral-system",
  "freelancer-email-sequence",
];

async function saveResult(userId: string, agentId: AgentId, input: FreelancerInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO freelancers_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: FreelancerInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { professionalName: "", specialty: "", targetClient: "", tone: "profesional" };

    let result;
    switch (agentId as AgentId) {
      case "personal-branding": result = await getPersonalBrandingAgent().run(user.userId, input); break;
      case "linkedin-optimization": result = await getLinkedInOptimizationAgent().run(user.userId, input); break;
      case "portfolio-description": result = await getPortfolioDescriptionAgent().run(user.userId, input); break;
      case "rate-justification": result = await getRateJustificationAgent().run(user.userId, input); break;
      case "client-proposal": result = await getClientProposalAgent().run(user.userId, input); break;
      case "testimonial-request": result = await getTestimonialRequestAgent().run(user.userId, input); break;
      case "niche-content": result = await getNicheContentAgent().run(user.userId, input); break;
      case "referral-system": result = await getReferralSystemAgent().run(user.userId, input); break;
      case "freelancer-email-sequence": result = await getFreelancerEmailSequenceAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") {
      return void res.status(401).json({ error: "Token inválido" });
    }
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}

