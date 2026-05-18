import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SuperiorChurnInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSuperiorChurnHealthScoreAgent,
  getSuperiorChurnInterventionAgent,
  getSuperiorChurnPlaybookAgent,
  getSuperiorChurnPredictorAgent,
  getSuperiorChurnRevenueImpactAgent,
  getSuperiorChurnSegmentAgent,
  getSuperiorChurnSignalsAgent,
  getSuperiorChurnWinbackAgent,
} from "../../../../../../../backend/os-agents/sectors/superiorchurn";

type SuperiorChurnLibraryAgentId =
  | "superiorchurn-predictor"
  | "superiorchurn-signals"
  | "superiorchurn-segment"
  | "superiorchurn-playbook"
  | "superiorchurn-winback"
  | "superiorchurn-healthscore"
  | "superiorchurn-revenueimpact"
  | "superiorchurn-intervention";

const IDS: SuperiorChurnLibraryAgentId[] = [
  "superiorchurn-predictor",
  "superiorchurn-signals",
  "superiorchurn-segment",
  "superiorchurn-playbook",
  "superiorchurn-winback",
  "superiorchurn-healthscore",
  "superiorchurn-revenueimpact",
  "superiorchurn-intervention",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceSuperiorChurnInput(userId: string, raw: unknown): SuperiorChurnInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const churnBrief = typeof raw.churnBrief === "string" ? raw.churnBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    churnBrief: churnBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO superiorchurn_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as SuperiorChurnLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceSuperiorChurnInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SuperiorChurnLibraryAgentId) {
      case "superiorchurn-predictor":
        result = await getSuperiorChurnPredictorAgent().run(input);
        break;
      case "superiorchurn-signals":
        result = await getSuperiorChurnSignalsAgent().run(input);
        break;
      case "superiorchurn-segment":
        result = await getSuperiorChurnSegmentAgent().run(input);
        break;
      case "superiorchurn-playbook":
        result = await getSuperiorChurnPlaybookAgent().run(input);
        break;
      case "superiorchurn-winback":
        result = await getSuperiorChurnWinbackAgent().run(input);
        break;
      case "superiorchurn-healthscore":
        result = await getSuperiorChurnHealthScoreAgent().run(input);
        break;
      case "superiorchurn-revenueimpact":
        result = await getSuperiorChurnRevenueImpactAgent().run(input);
        break;
      case "superiorchurn-intervention":
        result = await getSuperiorChurnInterventionAgent().run(input);
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
