import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAnalyticsInterpreterAgent,
  getChaptersAgent,
  getCollabFinderAgent,
  getCommunityPostAgent,
  getDescriptionSEOAgent,
  getIdeaGeneratorAgent,
  getMonetizationAdvisorAgent,
  getScriptWriterAgent,
  getShortsAdapterAgent,
  getSponsorshipEmailAgent,
  getThumbnailPromptAgent,
  getTitleOptimizerAgent,
  getVideoSEOAuditAgent,
} from "../../../../../../../backend/os-agents/sectors/youtubers";

type AgentId =
  | "idea-generator"
  | "script-writer"
  | "thumbnail-prompt"
  | "title-optimizer"
  | "description-seo"
  | "chapters"
  | "community-post"
  | "shorts-adapter"
  | "monetization-advisor"
  | "analytics-interpreter"
  | "collab-finder"
  | "sponsorship-email"
  | "video-seo-audit";

const AGENT_IDS: AgentId[] = [
  "idea-generator",
  "script-writer",
  "thumbnail-prompt",
  "title-optimizer",
  "description-seo",
  "chapters",
  "community-post",
  "shorts-adapter",
  "monetization-advisor",
  "analytics-interpreter",
  "collab-finder",
  "sponsorship-email",
  "video-seo-audit",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO youtubers_results (user_id, agent_id, input, result)
     VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
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
    if (!AGENT_IDS.includes(agentId as AgentId)) return res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? {};
    let result: unknown;

    switch (agentId as AgentId) {
      case "idea-generator":
        result = await getIdeaGeneratorAgent().generateIdeas(user.userId, input as never);
        break;
      case "script-writer":
        result = await getScriptWriterAgent().writeScript(user.userId, input as never);
        break;
      case "thumbnail-prompt":
        result = await getThumbnailPromptAgent().generateThumbnail(user.userId, input as never);
        break;
      case "title-optimizer":
        result = await getTitleOptimizerAgent().optimizeTitle(user.userId, input as never);
        break;
      case "description-seo":
        result = await getDescriptionSEOAgent().generateDescription(user.userId, input as never);
        break;
      case "chapters":
        result = await getChaptersAgent().generateChapters(user.userId, input as never);
        break;
      case "community-post":
        result = await getCommunityPostAgent().generatePosts(user.userId, input as never);
        break;
      case "shorts-adapter":
        result = await getShortsAdapterAgent().adaptToShorts(user.userId, input as never);
        break;
      case "monetization-advisor":
        result = await getMonetizationAdvisorAgent().adviseMonetization(user.userId, input as never);
        break;
      case "analytics-interpreter":
        result = await getAnalyticsInterpreterAgent().interpretAnalytics(user.userId, input as never);
        break;
      case "collab-finder":
        result = await getCollabFinderAgent().findCollabs(user.userId, input as never);
        break;
      case "sponsorship-email":
        result = await getSponsorshipEmailAgent().generateSponsorshipEmail(user.userId, input as never);
        break;
      case "video-seo-audit":
        result = await getVideoSEOAuditAgent().auditVideoSeo(user.userId, input as never);
        break;
    }

    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
