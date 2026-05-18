import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PushInput, PushPlatform } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPushAbandonmentNotifAgent,
  getPushEngagementNotifAgent,
  getPushMilestoneNotifAgent,
  getPushOptimizationAgent,
  getPushPersonalizationAgent,
  getPushPromotionalNotifAgent,
  getPushTransactionalNotifAgent,
  getPushWelcomeNotifAgent,
} from "../../../../../../../backend/os-agents/sectors/push";

type PushLibraryAgentId =
  | "push-welcome-notif"
  | "push-engagement-notif"
  | "push-transactional-notif"
  | "push-promotional-notif"
  | "push-abandonment-notif"
  | "push-milestone-notif"
  | "push-personalization"
  | "push-optimization";

const IDS: PushLibraryAgentId[] = [
  "push-welcome-notif",
  "push-engagement-notif",
  "push-transactional-notif",
  "push-promotional-notif",
  "push-abandonment-notif",
  "push-milestone-notif",
  "push-personalization",
  "push-optimization",
];

const PLATFORMS: PushPlatform[] = ["ios", "android", "both"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coercePushInput(userId: string, raw: unknown): PushInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const triggerEvent = typeof raw.triggerEvent === "string" ? raw.triggerEvent.trim() : "";
  const userSegment = typeof raw.userSegment === "string" ? raw.userSegment.trim() : undefined;
  const platformRaw = typeof raw.platform === "string" ? raw.platform.trim() : "";
  if (!sector || !brand || !triggerEvent) {
    throw new Error("sector, brand y triggerEvent son obligatorios");
  }
  let platform: PushPlatform | undefined;
  if (platformRaw) {
    if (!PLATFORMS.includes(platformRaw as PushPlatform)) {
      throw new Error("platform debe ser ios, android o both");
    }
    platform = platformRaw as PushPlatform;
  }
  return {
    userId,
    sector,
    brand,
    triggerEvent,
    userSegment: userSegment || undefined,
    platform,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO push_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as PushLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coercePushInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PushLibraryAgentId) {
      case "push-welcome-notif":
        result = await getPushWelcomeNotifAgent().run(input);
        break;
      case "push-engagement-notif":
        result = await getPushEngagementNotifAgent().run(input);
        break;
      case "push-transactional-notif":
        result = await getPushTransactionalNotifAgent().run(input);
        break;
      case "push-promotional-notif":
        result = await getPushPromotionalNotifAgent().run(input);
        break;
      case "push-abandonment-notif":
        result = await getPushAbandonmentNotifAgent().run(input);
        break;
      case "push-milestone-notif":
        result = await getPushMilestoneNotifAgent().run(input);
        break;
      case "push-personalization":
        result = await getPushPersonalizationAgent().run(input);
        break;
      case "push-optimization":
        result = await getPushOptimizationAgent().run(input);
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
        e.message.includes("debe ser");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
