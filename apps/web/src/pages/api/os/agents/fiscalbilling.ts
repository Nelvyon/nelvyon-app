import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { FiscalBillingCountryCode, FiscalBillingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getFiscalBillingDetectorAgent,
  getFiscalBillingExemptAgent,
  getFiscalBillingInvoiceAgent,
  getFiscalBillingKitDigitalAgent,
  getFiscalBillingReportAgent,
  getFiscalBillingReverseChargeAgent,
  getFiscalBillingVATAgent,
  getFiscalBillingValidatorAgent,
} from "../../../../../../../backend/os-agents/sectors/fiscalbilling";

type FiscalBillingLibraryAgentId =
  | "fiscalbilling-detector"
  | "fiscalbilling-vat"
  | "fiscalbilling-invoice"
  | "fiscalbilling-kit-digital"
  | "fiscalbilling-reverse-charge"
  | "fiscalbilling-exempt"
  | "fiscalbilling-report"
  | "fiscalbilling-validator";

const IDS: FiscalBillingLibraryAgentId[] = [
  "fiscalbilling-detector",
  "fiscalbilling-vat",
  "fiscalbilling-invoice",
  "fiscalbilling-kit-digital",
  "fiscalbilling-reverse-charge",
  "fiscalbilling-exempt",
  "fiscalbilling-report",
  "fiscalbilling-validator",
];

const COUNTRIES: FiscalBillingCountryCode[] = [
  "ES",
  "FR",
  "DE",
  "GB",
  "IT",
  "PT",
  "MX",
  "BR",
  "CO",
  "AR",
  "CL",
  "PE",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceCountry(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!s) return undefined;
  if (!COUNTRIES.includes(s as FiscalBillingCountryCode)) {
    throw new Error("countryCode debe ser un país fiscal soportado");
  }
  return s;
}

function coerceFiscalBillingInput(userId: string, raw: unknown): FiscalBillingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const taxId = typeof raw.taxId === "string" ? raw.taxId.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  const countryCode = coerceCountry(raw.countryCode);

  const isB2B = typeof raw.isB2B === "boolean" ? raw.isB2B : undefined;
  const isEuCrossBorder = typeof raw.isEuCrossBorder === "boolean" ? raw.isEuCrossBorder : undefined;

  return {
    userId,
    sector,
    brand,
    countryCode,
    taxId: taxId || undefined,
    isB2B,
    isEuCrossBorder,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO fiscalbilling_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as FiscalBillingLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceFiscalBillingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as FiscalBillingLibraryAgentId) {
      case "fiscalbilling-detector":
        result = await getFiscalBillingDetectorAgent().run(input);
        break;
      case "fiscalbilling-vat":
        result = await getFiscalBillingVATAgent().run(input);
        break;
      case "fiscalbilling-invoice":
        result = await getFiscalBillingInvoiceAgent().run(input);
        break;
      case "fiscalbilling-kit-digital":
        result = await getFiscalBillingKitDigitalAgent().run(input);
        break;
      case "fiscalbilling-reverse-charge":
        result = await getFiscalBillingReverseChargeAgent().run(input);
        break;
      case "fiscalbilling-exempt":
        result = await getFiscalBillingExemptAgent().run(input);
        break;
      case "fiscalbilling-report":
        result = await getFiscalBillingReportAgent().run(input);
        break;
      case "fiscalbilling-validator":
        result = await getFiscalBillingValidatorAgent().run(input);
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
