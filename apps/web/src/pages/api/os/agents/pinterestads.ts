import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PinterestAdsInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPinterestAdsAnalyticsAgent,
  getPinterestAdsAudienceAgent,
  getPinterestAdsAuthAgent,
  getPinterestAdsBidAgent,
  getPinterestAdsCampaignAgent,
  getPinterestAdsKeywordAgent,
  getPinterestAdsPinAgent,
  getPinterestAdsReportAgent,
} from "../../../../../../../backend/os-agents/sectors/pinterestads";

type PinterestAdsLibraryAgentId =
  | "pinterestads-auth"
  | "pinterestads-campaign"
  | "pinterestads-pin"
  | "pinterestads-audience"
  | "pinterestads-bid"
  | "pinterestads-report"
  | "pinterestads-keyword"
  | "pinterestads-analytics";

const IDS: PinterestAdsLibraryAgentId[] = [
  "pinterestads-auth",
  "pinterestads-campaign",
  "pinterestads-pin",
  "pinterestads-audience",
  "pinterestads-bid",
  "pinterestads-report",
  "pinterestads-keyword",
  "pinterestads-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coercePinterestAdsInput(userId: string, raw: unknown): PinterestAdsInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const verticalBrief = typeof raw.verticalBrief === "string" ? raw.verticalBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let targetCpaEur: number | undefined;
  if (raw.targetCpaEur !== undefined && raw.targetCpaEur !== null) {
    const n = typeof raw.targetCpaEur === "number" ? raw.targetCpaEur : Number(raw.targetCpaEur);
    if (!Number.isFinite(n)) throw new Error("targetCpaEur debe ser numérico");
    targetCpaEur = n;
  }

  return {
    userId,
    sector,
    brand,
    metricsBrief: metricsBrief || undefined,
    verticalBrief: verticalBrief || undefined,
    targetCpaEur,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO pinterestads_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as PinterestAdsLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coercePinterestAdsInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PinterestAdsLibraryAgentId) {
      case "pinterestads-auth":
        result = await getPinterestAdsAuthAgent().run(input);
        break;
      case "pinterestads-campaign":
        result = await getPinterestAdsCampaignAgent().run(input);
        break;
      case "pinterestads-pin":
        result = await getPinterestAdsPinAgent().run(input);
        break;
      case "pinterestads-audience":
        result = await getPinterestAdsAudienceAgent().run(input);
        break;
      case "pinterestads-bid":
        result = await getPinterestAdsBidAgent().run(input);
        break;
      case "pinterestads-report":
        result = await getPinterestAdsReportAgent().run(input);
        break;
      case "pinterestads-keyword":
        result = await getPinterestAdsKeywordAgent().run(input);
        break;
      case "pinterestads-analytics":
        result = await getPinterestAdsAnalyticsAgent().run(input);
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
