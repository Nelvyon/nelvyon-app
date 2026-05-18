import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SuperiorInfluencerInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSuperiorInfluencerAuditAgent,
  getSuperiorInfluencerCampaignAgent,
  getSuperiorInfluencerDiscoveryAgent,
  getSuperiorInfluencerNegotiationAgent,
  getSuperiorInfluencerOutreachAgent,
  getSuperiorInfluencerRelationshipAgent,
  getSuperiorInfluencerROIAgent,
  getSuperiorInfluencerTrackingAgent,
} from "../../../../../../../backend/os-agents/sectors/superiorinfluencer";

type SuperiorInfluencerLibraryAgentId =
  | "superiorinfluencer-discovery"
  | "superiorinfluencer-audit"
  | "superiorinfluencer-outreach"
  | "superiorinfluencer-negotiation"
  | "superiorinfluencer-campaign"
  | "superiorinfluencer-tracking"
  | "superiorinfluencer-roi"
  | "superiorinfluencer-relationship";

const IDS: SuperiorInfluencerLibraryAgentId[] = [
  "superiorinfluencer-discovery",
  "superiorinfluencer-audit",
  "superiorinfluencer-outreach",
  "superiorinfluencer-negotiation",
  "superiorinfluencer-campaign",
  "superiorinfluencer-tracking",
  "superiorinfluencer-roi",
  "superiorinfluencer-relationship",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceSuperiorInfluencerInput(userId: string, raw: unknown): SuperiorInfluencerInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const influencerBrief = typeof raw.influencerBrief === "string" ? raw.influencerBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    influencerBrief: influencerBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO superiorinfluencer_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as SuperiorInfluencerLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceSuperiorInfluencerInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SuperiorInfluencerLibraryAgentId) {
      case "superiorinfluencer-discovery":
        result = await getSuperiorInfluencerDiscoveryAgent().run(input);
        break;
      case "superiorinfluencer-audit":
        result = await getSuperiorInfluencerAuditAgent().run(input);
        break;
      case "superiorinfluencer-outreach":
        result = await getSuperiorInfluencerOutreachAgent().run(input);
        break;
      case "superiorinfluencer-negotiation":
        result = await getSuperiorInfluencerNegotiationAgent().run(input);
        break;
      case "superiorinfluencer-campaign":
        result = await getSuperiorInfluencerCampaignAgent().run(input);
        break;
      case "superiorinfluencer-tracking":
        result = await getSuperiorInfluencerTrackingAgent().run(input);
        break;
      case "superiorinfluencer-roi":
        result = await getSuperiorInfluencerROIAgent().run(input);
        break;
      case "superiorinfluencer-relationship":
        result = await getSuperiorInfluencerRelationshipAgent().run(input);
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
