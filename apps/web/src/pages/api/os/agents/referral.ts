import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ReferralInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getReferralAnalyticsAgent,
  getReferralCampaignAgent,
  getReferralCodeGeneratorAgent,
  getReferralEmailAgent,
  getReferralFraudDetectorAgent,
  getReferralLeaderboardAgent,
  getReferralRewardAgent,
  getReferralTrackingAgent,
} from "../../../../../../../backend/os-agents/sectors/referral";

type ReferralLibraryAgentId =
  | "referral-code-generator"
  | "referral-tracking"
  | "referral-reward"
  | "referral-fraud-detector"
  | "referral-email"
  | "referral-leaderboard"
  | "referral-analytics"
  | "referral-campaign";

const IDS: ReferralLibraryAgentId[] = [
  "referral-code-generator",
  "referral-tracking",
  "referral-reward",
  "referral-fraud-detector",
  "referral-email",
  "referral-leaderboard",
  "referral-analytics",
  "referral-campaign",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceReferralInput(userId: string, raw: unknown): ReferralInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const referralCode = typeof raw.referralCode === "string" ? raw.referralCode.trim() : undefined;
  const audienceHint = typeof raw.audienceHint === "string" ? raw.audienceHint.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");
  return {
    userId,
    sector,
    brand,
    referralCode: referralCode || undefined,
    audienceHint: audienceHint || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO referral_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ReferralLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceReferralInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ReferralLibraryAgentId) {
      case "referral-code-generator":
        result = await getReferralCodeGeneratorAgent().run(input);
        break;
      case "referral-tracking":
        result = await getReferralTrackingAgent().run(input);
        break;
      case "referral-reward":
        result = await getReferralRewardAgent().run(input);
        break;
      case "referral-fraud-detector":
        result = await getReferralFraudDetectorAgent().run(input);
        break;
      case "referral-email":
        result = await getReferralEmailAgent().run(input);
        break;
      case "referral-leaderboard":
        result = await getReferralLeaderboardAgent().run(input);
        break;
      case "referral-analytics":
        result = await getReferralAnalyticsAgent().run(input);
        break;
      case "referral-campaign":
        result = await getReferralCampaignAgent().run(input);
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
