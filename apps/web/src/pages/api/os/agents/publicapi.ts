import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PublicApiInput, PublicApiPlan, PublicApiWebhookEvent } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPublicApiAnalyticsAgent,
  getPublicApiAuthAgent,
  getPublicApiDocsAgent,
  getPublicApiRateLimiterAgent,
  getPublicApiRouterAgent,
  getPublicApiSandboxAgent,
  getPublicApiWebhookAgent,
  getPublicApiWebhookDispatchAgent,
} from "../../../../../../../backend/os-agents/sectors/publicapi";

type PublicApiLibraryAgentId =
  | "publicapi-auth"
  | "publicapi-rate-limiter"
  | "publicapi-router"
  | "publicapi-docs"
  | "publicapi-webhook"
  | "publicapi-webhook-dispatch"
  | "publicapi-analytics"
  | "publicapi-sandbox";

const IDS: PublicApiLibraryAgentId[] = [
  "publicapi-auth",
  "publicapi-rate-limiter",
  "publicapi-router",
  "publicapi-docs",
  "publicapi-webhook",
  "publicapi-webhook-dispatch",
  "publicapi-analytics",
  "publicapi-sandbox",
];

const PLANS: PublicApiPlan[] = ["starter", "pro", "agency"];

const WEBHOOK_EVENTS: PublicApiWebhookEvent[] = [
  "agent.completed",
  "agent.failed",
  "client.created",
  "client.churned",
  "billing.paid",
  "billing.failed",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coercePublicApiInput(userId: string, raw: unknown): PublicApiInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const endpointBrief = typeof raw.endpointBrief === "string" ? raw.endpointBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let plan: PublicApiPlan | undefined;
  if (raw.plan !== undefined && raw.plan !== null) {
    const p = typeof raw.plan === "string" ? raw.plan.trim().toLowerCase() : "";
    if (!PLANS.includes(p as PublicApiPlan)) throw new Error("plan debe ser starter, pro o agency");
    plan = p as PublicApiPlan;
  }

  let webhookEvent: PublicApiWebhookEvent | string | undefined;
  if (raw.webhookEvent !== undefined && raw.webhookEvent !== null) {
    const e = typeof raw.webhookEvent === "string" ? raw.webhookEvent.trim() : "";
    if (e && !WEBHOOK_EVENTS.includes(e as PublicApiWebhookEvent)) {
      throw new Error("webhookEvent no es un evento soportado");
    }
    webhookEvent = e ? e : undefined;
  }

  return {
    userId,
    sector,
    brand,
    plan,
    webhookEvent,
    endpointBrief: endpointBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO publicapi_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as PublicApiLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coercePublicApiInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PublicApiLibraryAgentId) {
      case "publicapi-auth":
        result = await getPublicApiAuthAgent().run(input);
        break;
      case "publicapi-rate-limiter":
        result = await getPublicApiRateLimiterAgent().run(input);
        break;
      case "publicapi-router":
        result = await getPublicApiRouterAgent().run(input);
        break;
      case "publicapi-docs":
        result = await getPublicApiDocsAgent().run(input);
        break;
      case "publicapi-webhook":
        result = await getPublicApiWebhookAgent().run(input);
        break;
      case "publicapi-webhook-dispatch":
        result = await getPublicApiWebhookDispatchAgent().run(input);
        break;
      case "publicapi-analytics":
        result = await getPublicApiAnalyticsAgent().run(input);
        break;
      case "publicapi-sandbox":
        result = await getPublicApiSandboxAgent().run(input);
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
        e.message.includes("debe ser") ||
        e.message.includes("no es");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
