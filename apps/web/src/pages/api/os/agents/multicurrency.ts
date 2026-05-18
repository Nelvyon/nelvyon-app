import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { MultiCurrencyCode, MultiCurrencyInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getMultiCurrencyBillingAgent,
  getMultiCurrencyConverterAgent,
  getMultiCurrencyDetectorAgent,
  getMultiCurrencyDisplayAgent,
  getMultiCurrencyPricingAgent,
  getMultiCurrencyRateUpdaterAgent,
  getMultiCurrencyReportAgent,
  getMultiCurrencyRiskAgent,
} from "../../../../../../../backend/os-agents/sectors/multicurrency";

type MultiCurrencyLibraryAgentId =
  | "multicurrency-detector"
  | "multicurrency-converter"
  | "multicurrency-pricing"
  | "multicurrency-display"
  | "multicurrency-billing"
  | "multicurrency-rate-updater"
  | "multicurrency-report"
  | "multicurrency-risk";

const IDS: MultiCurrencyLibraryAgentId[] = [
  "multicurrency-detector",
  "multicurrency-converter",
  "multicurrency-pricing",
  "multicurrency-display",
  "multicurrency-billing",
  "multicurrency-rate-updater",
  "multicurrency-report",
  "multicurrency-risk",
];

const CURRENCIES: MultiCurrencyCode[] = [
  "EUR",
  "USD",
  "GBP",
  "BRL",
  "MXN",
  "ARS",
  "COP",
  "CLP",
  "PEN",
  "UYU",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceCurrency(raw: unknown, field: string): MultiCurrencyCode | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!s) return undefined;
  if (!CURRENCIES.includes(s as MultiCurrencyCode)) {
    throw new Error(`${field} debe ser una moneda soportada`);
  }
  return s as MultiCurrencyCode;
}

function coerceMultiCurrencyInput(userId: string, raw: unknown): MultiCurrencyInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const countryCode = typeof raw.countryCode === "string" ? raw.countryCode.trim().toUpperCase() : undefined;
  const ipHint = typeof raw.ipHint === "string" ? raw.ipHint.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const locale = typeof raw.locale === "string" ? raw.locale.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  const preferredCurrency = coerceCurrency(raw.preferredCurrency, "preferredCurrency");
  const targetCurrency = coerceCurrency(raw.targetCurrency, "targetCurrency");

  return {
    userId,
    sector,
    brand,
    countryCode: countryCode || undefined,
    ipHint: ipHint || undefined,
    preferredCurrency,
    targetCurrency,
    locale: locale || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO multicurrency_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as MultiCurrencyLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceMultiCurrencyInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as MultiCurrencyLibraryAgentId) {
      case "multicurrency-detector":
        result = await getMultiCurrencyDetectorAgent().run(input);
        break;
      case "multicurrency-converter":
        result = await getMultiCurrencyConverterAgent().run(input);
        break;
      case "multicurrency-pricing":
        result = await getMultiCurrencyPricingAgent().run(input);
        break;
      case "multicurrency-display":
        result = await getMultiCurrencyDisplayAgent().run(input);
        break;
      case "multicurrency-billing":
        result = await getMultiCurrencyBillingAgent().run(input);
        break;
      case "multicurrency-rate-updater":
        result = await getMultiCurrencyRateUpdaterAgent().run(input);
        break;
      case "multicurrency-report":
        result = await getMultiCurrencyReportAgent().run(input);
        break;
      case "multicurrency-risk":
        result = await getMultiCurrencyRiskAgent().run(input);
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
