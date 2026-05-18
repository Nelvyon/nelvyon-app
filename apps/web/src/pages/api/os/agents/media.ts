import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { MediaInput } from "../../../../../../../backend/os-agents/sectors/media";
import {
  getMediaAudienceGrowthAgent,
  getMediaContentCalendarAgent,
  getMediaEmailSequenceAgent,
  getMediaMonetizationAgent,
  getMediaNewsletterWriterAgent,
  getMediaPodcastScriptAgent,
  getMediaSeoArticlesAgent,
  getMediaSponsorPitchAgent,
  getMediaViralHooksAgent,
} from "../../../../../../../backend/os-agents/sectors/media";

type AgentId =
  | "media-newsletter-writer"
  | "media-audience-growth"
  | "media-monetization"
  | "media-content-calendar"
  | "media-sponsor-pitch"
  | "media-seo-articles"
  | "media-podcast-script"
  | "media-viral-hooks"
  | "media-email-sequence";

const IDS: AgentId[] = [
  "media-newsletter-writer",
  "media-audience-growth",
  "media-monetization",
  "media-content-calendar",
  "media-sponsor-pitch",
  "media-seo-articles",
  "media-podcast-script",
  "media-viral-hooks",
  "media-email-sequence",
];

async function saveResult(userId: string, agentId: AgentId, input: MediaInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO media_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: MediaInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { niche: "", topic: "", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "media-newsletter-writer":
        result = await getMediaNewsletterWriterAgent().run(user.userId, input);
        break;
      case "media-audience-growth":
        result = await getMediaAudienceGrowthAgent().run(user.userId, input);
        break;
      case "media-monetization":
        result = await getMediaMonetizationAgent().run(user.userId, input);
        break;
      case "media-content-calendar":
        result = await getMediaContentCalendarAgent().run(user.userId, input);
        break;
      case "media-sponsor-pitch":
        result = await getMediaSponsorPitchAgent().run(user.userId, input);
        break;
      case "media-seo-articles":
        result = await getMediaSeoArticlesAgent().run(user.userId, input);
        break;
      case "media-podcast-script":
        result = await getMediaPodcastScriptAgent().run(user.userId, input);
        break;
      case "media-viral-hooks":
        result = await getMediaViralHooksAgent().run(user.userId, input);
        break;
      case "media-email-sequence":
        result = await getMediaEmailSequenceAgent().run(user.userId, input);
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
