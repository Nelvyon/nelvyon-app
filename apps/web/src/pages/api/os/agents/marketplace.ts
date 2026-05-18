import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { MarketplaceInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getMarketplaceAnalyticsAgent,
  getMarketplaceCategoryAgent,
  getMarketplaceListingAgent,
  getMarketplacePayoutAgent,
  getMarketplaceQAAgent,
  getMarketplaceRecommenderAgent,
  getMarketplaceReviewAgent,
  getMarketplaceSearchAgent,
} from "../../../../../../../backend/os-agents/sectors/marketplace";

type MarketplaceLibraryAgentId =
  | "marketplace-listing"
  | "marketplace-review"
  | "marketplace-payout"
  | "marketplace-qa"
  | "marketplace-category"
  | "marketplace-search"
  | "marketplace-analytics"
  | "marketplace-recommender";

const IDS: MarketplaceLibraryAgentId[] = [
  "marketplace-listing",
  "marketplace-review",
  "marketplace-payout",
  "marketplace-qa",
  "marketplace-category",
  "marketplace-search",
  "marketplace-analytics",
  "marketplace-recommender",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceMarketplaceInput(userId: string, raw: unknown): MarketplaceInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const developerId = typeof raw.developerId === "string" ? raw.developerId.trim() : undefined;
  const listingAgentId = typeof raw.listingAgentId === "string" ? raw.listingAgentId.trim() : undefined;
  const useCaseBrief = typeof raw.useCaseBrief === "string" ? raw.useCaseBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let priceMonthlyEur: number | undefined;
  if (raw.priceMonthlyEur !== undefined && raw.priceMonthlyEur !== null) {
    const n = typeof raw.priceMonthlyEur === "number" ? raw.priceMonthlyEur : Number(raw.priceMonthlyEur);
    if (!Number.isFinite(n)) throw new Error("priceMonthlyEur debe ser numérico");
    priceMonthlyEur = n;
  }

  return {
    userId,
    sector,
    brand,
    developerId: developerId || undefined,
    listingAgentId: listingAgentId || undefined,
    priceMonthlyEur,
    useCaseBrief: useCaseBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO marketplace_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as MarketplaceLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceMarketplaceInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as MarketplaceLibraryAgentId) {
      case "marketplace-listing":
        result = await getMarketplaceListingAgent().run(input);
        break;
      case "marketplace-review":
        result = await getMarketplaceReviewAgent().run(input);
        break;
      case "marketplace-payout":
        result = await getMarketplacePayoutAgent().run(input);
        break;
      case "marketplace-qa":
        result = await getMarketplaceQAAgent().run(input);
        break;
      case "marketplace-category":
        result = await getMarketplaceCategoryAgent().run(input);
        break;
      case "marketplace-search":
        result = await getMarketplaceSearchAgent().run(input);
        break;
      case "marketplace-analytics":
        result = await getMarketplaceAnalyticsAgent().run(input);
        break;
      case "marketplace-recommender":
        result = await getMarketplaceRecommenderAgent().run(input);
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
