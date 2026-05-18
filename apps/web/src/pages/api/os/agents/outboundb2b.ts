import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { OutboundB2BInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getOutboundB2BAnalyticsAgent,
  getOutboundB2BCopywriterAgent,
  getOutboundB2BFollowUpAgent,
  getOutboundB2BMeetingAgent,
  getOutboundB2BProspectorAgent,
  getOutboundB2BQualifierAgent,
  getOutboundB2BResearchAgent,
  getOutboundB2BSequenceAgent,
} from "../../../../../../../backend/os-agents/sectors/outboundb2b";

type OutboundB2BLibraryAgentId =
  | "outboundb2b-prospector"
  | "outboundb2b-research"
  | "outboundb2b-copywriter"
  | "outboundb2b-sequence"
  | "outboundb2b-followup"
  | "outboundb2b-qualifier"
  | "outboundb2b-meeting"
  | "outboundb2b-analytics";

const IDS: OutboundB2BLibraryAgentId[] = [
  "outboundb2b-prospector",
  "outboundb2b-research",
  "outboundb2b-copywriter",
  "outboundb2b-sequence",
  "outboundb2b-followup",
  "outboundb2b-qualifier",
  "outboundb2b-meeting",
  "outboundb2b-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceOutboundB2BInput(userId: string, raw: unknown): OutboundB2BInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const outboundBrief = typeof raw.outboundBrief === "string" ? raw.outboundBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    outboundBrief: outboundBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO outboundb2b_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as OutboundB2BLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceOutboundB2BInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as OutboundB2BLibraryAgentId) {
      case "outboundb2b-prospector":
        result = await getOutboundB2BProspectorAgent().run(input);
        break;
      case "outboundb2b-research":
        result = await getOutboundB2BResearchAgent().run(input);
        break;
      case "outboundb2b-copywriter":
        result = await getOutboundB2BCopywriterAgent().run(input);
        break;
      case "outboundb2b-sequence":
        result = await getOutboundB2BSequenceAgent().run(input);
        break;
      case "outboundb2b-followup":
        result = await getOutboundB2BFollowUpAgent().run(input);
        break;
      case "outboundb2b-qualifier":
        result = await getOutboundB2BQualifierAgent().run(input);
        break;
      case "outboundb2b-meeting":
        result = await getOutboundB2BMeetingAgent().run(input);
        break;
      case "outboundb2b-analytics":
        result = await getOutboundB2BAnalyticsAgent().run(input);
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
