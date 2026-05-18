import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type {
  ZapierActionType,
  ZapierInput,
  ZapierIntegrationPlatform,
  ZapierTriggerEvent,
} from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getZapierActionAgent,
  getZapierAnalyticsAgent,
  getZapierAuthAgent,
  getZapierErrorAgent,
  getZapierMappingAgent,
  getZapierTemplateAgent,
  getZapierTriggerAgent,
  getZapierWebhookAgent,
} from "../../../../../../../backend/os-agents/sectors/zapier";

type ZapierLibraryAgentId =
  | "zapier-trigger"
  | "zapier-action"
  | "zapier-auth"
  | "zapier-webhook"
  | "zapier-mapping"
  | "zapier-error"
  | "zapier-analytics"
  | "zapier-template";

const IDS: ZapierLibraryAgentId[] = [
  "zapier-trigger",
  "zapier-action",
  "zapier-auth",
  "zapier-webhook",
  "zapier-mapping",
  "zapier-error",
  "zapier-analytics",
  "zapier-template",
];

const PLATFORMS: ZapierIntegrationPlatform[] = ["zapier", "make", "both"];

const TRIGGER_EVENTS: ZapierTriggerEvent[] = [
  "agent.completed",
  "client.created",
  "billing.paid",
  "report.generated",
  "churn.detected",
  "review.received",
];

const ACTION_TYPES: ZapierActionType[] = [
  "run_agent",
  "create_client",
  "send_report",
  "trigger_campaign",
  "update_crm",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceZapierInput(userId: string, raw: unknown): ZapierInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const workflowBrief = typeof raw.workflowBrief === "string" ? raw.workflowBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let platform: ZapierIntegrationPlatform | undefined;
  if (raw.platform !== undefined && raw.platform !== null) {
    const p = typeof raw.platform === "string" ? raw.platform.trim().toLowerCase() : "";
    if (!PLATFORMS.includes(p as ZapierIntegrationPlatform)) {
      throw new Error("platform debe ser zapier, make o both");
    }
    platform = p as ZapierIntegrationPlatform;
  }

  let triggerEvent: ZapierTriggerEvent | string | undefined;
  if (raw.triggerEvent !== undefined && raw.triggerEvent !== null) {
    const t = typeof raw.triggerEvent === "string" ? raw.triggerEvent.trim() : "";
    if (t && !TRIGGER_EVENTS.includes(t as ZapierTriggerEvent)) {
      throw new Error("triggerEvent no es un evento soportado");
    }
    triggerEvent = t ? t : undefined;
  }

  let actionType: ZapierActionType | string | undefined;
  if (raw.actionType !== undefined && raw.actionType !== null) {
    const a = typeof raw.actionType === "string" ? raw.actionType.trim() : "";
    if (a && !ACTION_TYPES.includes(a as ZapierActionType)) {
      throw new Error("actionType no es una acción soportada");
    }
    actionType = a ? a : undefined;
  }

  return {
    userId,
    sector,
    brand,
    platform,
    triggerEvent,
    actionType,
    workflowBrief: workflowBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO zapier_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ZapierLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceZapierInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ZapierLibraryAgentId) {
      case "zapier-trigger":
        result = await getZapierTriggerAgent().run(input);
        break;
      case "zapier-action":
        result = await getZapierActionAgent().run(input);
        break;
      case "zapier-auth":
        result = await getZapierAuthAgent().run(input);
        break;
      case "zapier-webhook":
        result = await getZapierWebhookAgent().run(input);
        break;
      case "zapier-mapping":
        result = await getZapierMappingAgent().run(input);
        break;
      case "zapier-error":
        result = await getZapierErrorAgent().run(input);
        break;
      case "zapier-analytics":
        result = await getZapierAnalyticsAgent().run(input);
        break;
      case "zapier-template":
        result = await getZapierTemplateAgent().run(input);
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
