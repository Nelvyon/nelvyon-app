import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { StartupInput } from "../../../../../../../backend/os-agents/sectors/startups";
import {
  getCompetitivePositioningAgent,
  getDeveloperCommunityAgent,
  getElevatorPitchAgent,
  getGrowthHackingAgent,
  getInvestorDeckNarrativeAgent,
  getJobDescriptionTechAgent,
  getOnboardingEmailSequenceAgent,
  getPRAndMediaAgent,
  getProductHuntLaunchAgent,
  getStartupSocialMediaAgent,
  getTechBlogContentAgent,
} from "../../../../../../../backend/os-agents/sectors/startups";

type AgentId =
  | "elevator-pitch"
  | "investor-deck-narrative"
  | "product-hunt-launch"
  | "tech-blog-content"
  | "developer-community"
  | "competitive-positioning"
  | "growth-hacking"
  | "job-description-tech"
  | "pr-and-media"
  | "onboarding-email-sequence"
  | "startup-social-media";

const IDS: AgentId[] = [
  "elevator-pitch",
  "investor-deck-narrative",
  "product-hunt-launch",
  "tech-blog-content",
  "developer-community",
  "competitive-positioning",
  "growth-hacking",
  "job-description-tech",
  "pr-and-media",
  "onboarding-email-sequence",
  "startup-social-media",
];

async function saveResult(userId: string, agentId: AgentId, input: StartupInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO startups_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: StartupInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { startupName: "", productDescription: "", targetMarket: "", stage: "mvp", tone: "directo" };
    let result;
    switch (agentId as AgentId) {
      case "elevator-pitch": result = await getElevatorPitchAgent().run(user.userId, input); break;
      case "investor-deck-narrative": result = await getInvestorDeckNarrativeAgent().run(user.userId, input); break;
      case "product-hunt-launch": result = await getProductHuntLaunchAgent().run(user.userId, input); break;
      case "tech-blog-content": result = await getTechBlogContentAgent().run(user.userId, input); break;
      case "developer-community": result = await getDeveloperCommunityAgent().run(user.userId, input); break;
      case "competitive-positioning": result = await getCompetitivePositioningAgent().run(user.userId, input); break;
      case "growth-hacking": result = await getGrowthHackingAgent().run(user.userId, input); break;
      case "job-description-tech": result = await getJobDescriptionTechAgent().run(user.userId, input); break;
      case "pr-and-media": result = await getPRAndMediaAgent().run(user.userId, input); break;
      case "onboarding-email-sequence": result = await getOnboardingEmailSequenceAgent().run(user.userId, input); break;
      case "startup-social-media": result = await getStartupSocialMediaAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}

