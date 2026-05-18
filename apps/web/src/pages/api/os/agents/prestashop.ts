import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PrestaShopBuyerSegment, PrestaShopInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPrestaShopAbandonedCartAgent,
  getPrestaShopAnalyticsAgent,
  getPrestaShopAuthAgent,
  getPrestaShopEmailAgent,
  getPrestaShopOrderAgent,
  getPrestaShopProductAgent,
  getPrestaShopReviewAgent,
  getPrestaShopSEOAgent,
} from "../../../../../../../backend/os-agents/sectors/prestashop";

type PrestaShopLibraryAgentId =
  | "prestashop-auth"
  | "prestashop-product"
  | "prestashop-order"
  | "prestashop-abandoned-cart"
  | "prestashop-seo"
  | "prestashop-review"
  | "prestashop-analytics"
  | "prestashop-email";

const IDS: PrestaShopLibraryAgentId[] = [
  "prestashop-auth",
  "prestashop-product",
  "prestashop-order",
  "prestashop-abandoned-cart",
  "prestashop-seo",
  "prestashop-review",
  "prestashop-analytics",
  "prestashop-email",
];

const SEGMENTS: PrestaShopBuyerSegment[] = ["one_time", "recurring", "vip"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coercePrestaShopInput(userId: string, raw: unknown): PrestaShopInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const storeUrl = typeof raw.storeUrl === "string" ? raw.storeUrl.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let segment: PrestaShopBuyerSegment | undefined;
  if (raw.segment !== undefined && raw.segment !== null) {
    const s = typeof raw.segment === "string" ? raw.segment.trim().toLowerCase() : "";
    if (s) {
      if (!SEGMENTS.includes(s as PrestaShopBuyerSegment)) {
        throw new Error("segment debe ser one_time, recurring o vip");
      }
      segment = s as PrestaShopBuyerSegment;
    }
  }

  return {
    userId,
    sector,
    brand,
    storeUrl: storeUrl || undefined,
    segment,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO prestashop_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as PrestaShopLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coercePrestaShopInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PrestaShopLibraryAgentId) {
      case "prestashop-auth":
        result = await getPrestaShopAuthAgent().run(input);
        break;
      case "prestashop-product":
        result = await getPrestaShopProductAgent().run(input);
        break;
      case "prestashop-order":
        result = await getPrestaShopOrderAgent().run(input);
        break;
      case "prestashop-abandoned-cart":
        result = await getPrestaShopAbandonedCartAgent().run(input);
        break;
      case "prestashop-seo":
        result = await getPrestaShopSEOAgent().run(input);
        break;
      case "prestashop-review":
        result = await getPrestaShopReviewAgent().run(input);
        break;
      case "prestashop-analytics":
        result = await getPrestaShopAnalyticsAgent().run(input);
        break;
      case "prestashop-email":
        result = await getPrestaShopEmailAgent().run(input);
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
