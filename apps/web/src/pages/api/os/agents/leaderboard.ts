import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { LeaderboardInput, LeaderboardScope } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getLeaderboardBadgeAgent,
  getLeaderboardChallengeAgent,
  getLeaderboardNotifierAgent,
  getLeaderboardPublicPageAgent,
  getLeaderboardRankingAgent,
  getLeaderboardRewardAgent,
  getLeaderboardSnapshotAgent,
  getLeaderboardViralAgent,
} from "../../../../../../../backend/os-agents/sectors/leaderboard";

type LeaderboardLibraryAgentId =
  | "leaderboard-ranking"
  | "leaderboard-badge"
  | "leaderboard-notifier"
  | "leaderboard-public-page"
  | "leaderboard-challenge"
  | "leaderboard-reward"
  | "leaderboard-snapshot"
  | "leaderboard-viral";

const IDS: LeaderboardLibraryAgentId[] = [
  "leaderboard-ranking",
  "leaderboard-badge",
  "leaderboard-notifier",
  "leaderboard-public-page",
  "leaderboard-challenge",
  "leaderboard-reward",
  "leaderboard-snapshot",
  "leaderboard-viral",
];

const SCOPES: LeaderboardScope[] = ["global", "sector"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceLeaderboardInput(userId: string, raw: unknown): LeaderboardInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const scopeRaw = typeof raw.scope === "string" ? raw.scope.trim() : "";
  const week = typeof raw.week === "string" ? raw.week.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let scope: LeaderboardScope | undefined;
  if (scopeRaw) {
    if (!SCOPES.includes(scopeRaw as LeaderboardScope)) {
      throw new Error("scope debe ser global o sector");
    }
    scope = scopeRaw as LeaderboardScope;
  }

  const optInPublic = typeof raw.optInPublic === "boolean" ? raw.optInPublic : undefined;

  return {
    userId,
    sector,
    brand,
    scope,
    optInPublic,
    week: week || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO leaderboard_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as LeaderboardLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceLeaderboardInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as LeaderboardLibraryAgentId) {
      case "leaderboard-ranking":
        result = await getLeaderboardRankingAgent().run(input);
        break;
      case "leaderboard-badge":
        result = await getLeaderboardBadgeAgent().run(input);
        break;
      case "leaderboard-notifier":
        result = await getLeaderboardNotifierAgent().run(input);
        break;
      case "leaderboard-public-page":
        result = await getLeaderboardPublicPageAgent().run(input);
        break;
      case "leaderboard-challenge":
        result = await getLeaderboardChallengeAgent().run(input);
        break;
      case "leaderboard-reward":
        result = await getLeaderboardRewardAgent().run(input);
        break;
      case "leaderboard-snapshot":
        result = await getLeaderboardSnapshotAgent().run(input);
        break;
      case "leaderboard-viral":
        result = await getLeaderboardViralAgent().run(input);
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
