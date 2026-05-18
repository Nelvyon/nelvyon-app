import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { KlaviyoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getKlaviyoABTestAgent,
  getKlaviyoAnalyticsAgent,
  getKlaviyoAuthAgent,
  getKlaviyoCampaignAgent,
  getKlaviyoFlowAgent,
  getKlaviyoSegmentAgent,
  getKlaviyoSyncAgent,
  getKlaviyoTemplateAgent,
} from "../../../../../../../backend/os-agents/sectors/klaviyo";

type KlaviyoLibraryAgentId =
  | "klaviyo-auth"
  | "klaviyo-segment"
  | "klaviyo-flow"
  | "klaviyo-campaign"
  | "klaviyo-template"
  | "klaviyo-analytics"
  | "klaviyo-sync"
  | "klaviyo-abtest";

const IDS: KlaviyoLibraryAgentId[] = [
  "klaviyo-auth",
  "klaviyo-segment",
  "klaviyo-flow",
  "klaviyo-campaign",
  "klaviyo-template",
  "klaviyo-analytics",
  "klaviyo-sync",
  "klaviyo-abtest",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceKlaviyoInput(userId: string, raw: unknown): KlaviyoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const verticalBrief = typeof raw.verticalBrief === "string" ? raw.verticalBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    metricsBrief: metricsBrief || undefined,
    verticalBrief: verticalBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO klaviyo_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as KlaviyoLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceKlaviyoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as KlaviyoLibraryAgentId) {
      case "klaviyo-auth":
        result = await getKlaviyoAuthAgent().run(input);
        break;
      case "klaviyo-segment":
        result = await getKlaviyoSegmentAgent().run(input);
        break;
      case "klaviyo-flow":
        result = await getKlaviyoFlowAgent().run(input);
        break;
      case "klaviyo-campaign":
        result = await getKlaviyoCampaignAgent().run(input);
        break;
      case "klaviyo-template":
        result = await getKlaviyoTemplateAgent().run(input);
        break;
      case "klaviyo-analytics":
        result = await getKlaviyoAnalyticsAgent().run(input);
        break;
      case "klaviyo-sync":
        result = await getKlaviyoSyncAgent().run(input);
        break;
      case "klaviyo-abtest":
        result = await getKlaviyoABTestAgent().run(input);
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
