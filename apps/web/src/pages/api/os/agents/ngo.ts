import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { NgoInput } from "../../../../../../../backend/os-agents/sectors/ngo";
import {
  getNgoCorporatePartnershipAgent,
  getNgoDonationCampaignAgent,
  getNgoEmailCampaignAgent,
  getNgoGrantWritingAgent,
  getNgoOrganizationProfileAgent,
  getNgoSocialMediaAgent,
  getNgoTransparencyReportAgent,
  getNgoVolunteerRecruitmentAgent,
} from "../../../../../../../backend/os-agents/sectors/ngo";

type AgentId =
  | "ngo-organization-profile"
  | "ngo-donation-campaign"
  | "ngo-social-media"
  | "ngo-volunteer-recruitment"
  | "ngo-grant-writing"
  | "ngo-corporate-partnership"
  | "ngo-email-campaign"
  | "ngo-transparency-report";

const IDS: AgentId[] = [
  "ngo-organization-profile",
  "ngo-donation-campaign",
  "ngo-social-media",
  "ngo-volunteer-recruitment",
  "ngo-grant-writing",
  "ngo-corporate-partnership",
  "ngo-email-campaign",
  "ngo-transparency-report",
];

async function saveResult(userId: string, agentId: AgentId, input: NgoInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO ngo_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: NgoInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { organizationName: "", cause: "otro", targetAudience: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "ngo-organization-profile": result = await getNgoOrganizationProfileAgent().run(user.userId, input); break;
      case "ngo-donation-campaign": result = await getNgoDonationCampaignAgent().run(user.userId, input); break;
      case "ngo-social-media": result = await getNgoSocialMediaAgent().run(user.userId, input); break;
      case "ngo-volunteer-recruitment": result = await getNgoVolunteerRecruitmentAgent().run(user.userId, input); break;
      case "ngo-grant-writing": result = await getNgoGrantWritingAgent().run(user.userId, input); break;
      case "ngo-corporate-partnership": result = await getNgoCorporatePartnershipAgent().run(user.userId, input); break;
      case "ngo-email-campaign": result = await getNgoEmailCampaignAgent().run(user.userId, input); break;
      case "ngo-transparency-report": result = await getNgoTransparencyReportAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
