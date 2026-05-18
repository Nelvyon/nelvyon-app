import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { BillingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getBillingAlertAgent,
  getBillingCohortAgent,
  getBillingDunningAgent,
  getBillingForecastAgent,
  getBillingInvoiceAgent,
  getBillingPricingAgent,
  getBillingRevenueAgent,
  getBillingSubscriptionAgent,
} from "../../../../../../../backend/os-agents/sectors/billing";

type BillingLibraryAgentId =
  | "billing-subscription"
  | "billing-dunning"
  | "billing-revenue"
  | "billing-forecast"
  | "billing-invoice"
  | "billing-pricing"
  | "billing-alert"
  | "billing-cohort";

const IDS: BillingLibraryAgentId[] = [
  "billing-subscription",
  "billing-dunning",
  "billing-revenue",
  "billing-forecast",
  "billing-invoice",
  "billing-pricing",
  "billing-alert",
  "billing-cohort",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceBillingInput(userId: string, raw: unknown): BillingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const billingBrief = typeof raw.billingBrief === "string" ? raw.billingBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    billingBrief: billingBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO billing_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as BillingLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceBillingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as BillingLibraryAgentId) {
      case "billing-subscription":
        result = await getBillingSubscriptionAgent().run(input);
        break;
      case "billing-dunning":
        result = await getBillingDunningAgent().run(input);
        break;
      case "billing-revenue":
        result = await getBillingRevenueAgent().run(input);
        break;
      case "billing-forecast":
        result = await getBillingForecastAgent().run(input);
        break;
      case "billing-invoice":
        result = await getBillingInvoiceAgent().run(input);
        break;
      case "billing-pricing":
        result = await getBillingPricingAgent().run(input);
        break;
      case "billing-alert":
        result = await getBillingAlertAgent().run(input);
        break;
      case "billing-cohort":
        result = await getBillingCohortAgent().run(input);
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
