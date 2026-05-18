import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { CompetitiveInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getCompetitiveAdsSpyAgent,
  getCompetitiveBacklinkProfileAgent,
  getCompetitiveContentGapAgent,
  getCompetitivePositioningAnalystAgent,
  getCompetitivePricingIntelAgent,
  getCompetitiveReviewMinerAgent,
  getCompetitiveSocialPresenceAgent,
  getCompetitiveWinLossAgent,
} from "../../../../../../../backend/os-agents/sectors/competitive";

type CompetitiveAgentId =
  | "competitive-positioning-analyst"
  | "competitive-content-gap"
  | "competitive-pricing-intel"
  | "competitive-backlink-profile"
  | "competitive-ads-spy"
  | "competitive-social-presence"
  | "competitive-review-miner"
  | "competitive-win-loss";

const IDS: CompetitiveAgentId[] = [
  "competitive-positioning-analyst",
  "competitive-content-gap",
  "competitive-pricing-intel",
  "competitive-backlink-profile",
  "competitive-ads-spy",
  "competitive-social-presence",
  "competitive-review-miner",
  "competitive-win-loss",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceCompetitiveInput(userId: string, raw: unknown): CompetitiveInput {
  if (!isRecord(raw)) {
    throw new Error("input inválido");
  }
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const competitorUrl = typeof raw.competitorUrl === "string" ? raw.competitorUrl.trim() : "";
  const ownBrand = typeof raw.ownBrand === "string" ? raw.ownBrand.trim() : "";
  if (!sector || !competitorUrl || !ownBrand) {
    throw new Error("sector, competitorUrl y ownBrand son obligatorios");
  }
  let ownMetrics: Record<string, string> | undefined;
  if (raw.ownMetrics != null) {
    if (!isRecord(raw.ownMetrics)) throw new Error("ownMetrics debe ser un objeto");
    ownMetrics = {};
    for (const [k, val] of Object.entries(raw.ownMetrics)) {
      ownMetrics[String(k)] = typeof val === "string" ? val : JSON.stringify(val);
    }
  }
  return {
    userId,
    sector,
    competitorUrl,
    ownBrand,
    ownMetrics,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO competitive_rt_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as CompetitiveAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceCompetitiveInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as CompetitiveAgentId) {
      case "competitive-positioning-analyst":
        result = await getCompetitivePositioningAnalystAgent().run(input);
        break;
      case "competitive-content-gap":
        result = await getCompetitiveContentGapAgent().run(input);
        break;
      case "competitive-pricing-intel":
        result = await getCompetitivePricingIntelAgent().run(input);
        break;
      case "competitive-backlink-profile":
        result = await getCompetitiveBacklinkProfileAgent().run(input);
        break;
      case "competitive-ads-spy":
        result = await getCompetitiveAdsSpyAgent().run(input);
        break;
      case "competitive-social-presence":
        result = await getCompetitiveSocialPresenceAgent().run(input);
        break;
      case "competitive-review-miner":
        result = await getCompetitiveReviewMinerAgent().run(input);
        break;
      case "competitive-win-loss":
        result = await getCompetitiveWinLossAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input.sector, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
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
