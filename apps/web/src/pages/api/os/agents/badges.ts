import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { BadgesInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getBadgesAchievementCopyAgent,
  getBadgesCertificationPathAgent,
  getBadgesEmailCelebrationAgent,
  getBadgesLeaderboardAgent,
  getBadgesMilestoneTrackerAgent,
  getBadgesRetentionTriggerAgent,
  getBadgesShareableContentAgent,
  getBadgesSystemDesignerAgent,
} from "../../../../../../../backend/os-agents/sectors/badges";

type BadgesLibraryAgentId =
  | "badges-system-designer"
  | "badges-achievement-copy"
  | "badges-milestone-tracker"
  | "badges-certification-path"
  | "badges-shareable-content"
  | "badges-leaderboard"
  | "badges-email-celebration"
  | "badges-retention-trigger";

const IDS: BadgesLibraryAgentId[] = [
  "badges-system-designer",
  "badges-achievement-copy",
  "badges-milestone-tracker",
  "badges-certification-path",
  "badges-shareable-content",
  "badges-leaderboard",
  "badges-email-celebration",
  "badges-retention-trigger",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceUserActivity(raw: unknown): Record<string, string> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
    else if (v != null) out[k] = String(v);
  }
  return Object.keys(out).length ? out : undefined;
}

function coerceBadgesInput(userId: string, raw: unknown): BadgesInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const productName = typeof raw.productName === "string" ? raw.productName.trim() : "";
  if (!sector || !productName) {
    throw new Error("sector y productName son obligatorios");
  }
  const currentLevel = typeof raw.currentLevel === "string" ? raw.currentLevel.trim() : undefined;
  const userActivity = coerceUserActivity(raw.userActivity);
  return {
    userId,
    sector,
    productName,
    currentLevel: currentLevel || undefined,
    userActivity,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO badges_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as BadgesLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceBadgesInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as BadgesLibraryAgentId) {
      case "badges-system-designer":
        result = await getBadgesSystemDesignerAgent().run(input);
        break;
      case "badges-achievement-copy":
        result = await getBadgesAchievementCopyAgent().run(input);
        break;
      case "badges-milestone-tracker":
        result = await getBadgesMilestoneTrackerAgent().run(input);
        break;
      case "badges-certification-path":
        result = await getBadgesCertificationPathAgent().run(input);
        break;
      case "badges-shareable-content":
        result = await getBadgesShareableContentAgent().run(input);
        break;
      case "badges-leaderboard":
        result = await getBadgesLeaderboardAgent().run(input);
        break;
      case "badges-email-celebration":
        result = await getBadgesEmailCelebrationAgent().run(input);
        break;
      case "badges-retention-trigger":
        result = await getBadgesRetentionTriggerAgent().run(input);
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
