import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SocialInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSocialAnalyticsNarratorAgent,
  getSocialCampaignLaunchAgent,
  getSocialCompetitorMonitorAgent,
  getSocialContentCalendarAgent,
  getSocialCopywriterAgent,
  getSocialCrisisResponseAgent,
  getSocialEngagementHooksAgent,
  getSocialHashtagStrategistAgent,
  getSocialStorytellingAgent,
} from "../../../../../../../backend/os-agents/sectors/social";

type SocialAgentId =
  | "social-content-calendar"
  | "social-copywriter"
  | "social-hashtag-strategist"
  | "social-engagement-hooks"
  | "social-storytelling"
  | "social-crisis-response"
  | "social-competitor-monitor"
  | "social-campaign-launch"
  | "social-analytics-narrator";

const IDS: SocialAgentId[] = [
  "social-content-calendar",
  "social-copywriter",
  "social-hashtag-strategist",
  "social-engagement-hooks",
  "social-storytelling",
  "social-crisis-response",
  "social-competitor-monitor",
  "social-campaign-launch",
  "social-analytics-narrator",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceSocialInput(userId: string, raw: unknown): SocialInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  if (!sector || !brand || !targetAudience) {
    throw new Error("sector, brand y targetAudience son obligatorios");
  }
  if (!Array.isArray(raw.platforms) || raw.platforms.length === 0) {
    throw new Error("platforms debe ser un array no vacío");
  }
  const platforms = raw.platforms.map((p) => String(p)).filter(Boolean);
  if (platforms.length === 0) throw new Error("platforms inválido");
  const tone = typeof raw.tone === "string" ? raw.tone.trim() : undefined;
  const campaignGoal = typeof raw.campaignGoal === "string" ? raw.campaignGoal.trim() : undefined;
  return {
    userId,
    sector,
    brand,
    platforms,
    targetAudience,
    tone: tone || undefined,
    campaignGoal: campaignGoal || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO social_results (user_id, agent_id, sector, input, output)
     VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)`,
    [userId, agentId, sector, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
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
    if (!IDS.includes(agentId as SocialAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceSocialInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SocialAgentId) {
      case "social-content-calendar":
        result = await getSocialContentCalendarAgent().run(input);
        break;
      case "social-copywriter":
        result = await getSocialCopywriterAgent().run(input);
        break;
      case "social-hashtag-strategist":
        result = await getSocialHashtagStrategistAgent().run(input);
        break;
      case "social-engagement-hooks":
        result = await getSocialEngagementHooksAgent().run(input);
        break;
      case "social-storytelling":
        result = await getSocialStorytellingAgent().run(input);
        break;
      case "social-crisis-response":
        result = await getSocialCrisisResponseAgent().run(input);
        break;
      case "social-competitor-monitor":
        result = await getSocialCompetitorMonitorAgent().run(input);
        break;
      case "social-campaign-launch":
        result = await getSocialCampaignLaunchAgent().run(input);
        break;
      case "social-analytics-narrator":
        result = await getSocialAnalyticsNarratorAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input.sector, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorios") ||
        e.message.includes("debe ser") ||
        e.message.includes("array");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
