import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { MembresiaCursosInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getMembresiaCursosAccessAgent,
  getMembresiaCursosAnalyticsAgent,
  getMembresiaCursosBuilderAgent,
  getMembresiaCursosCertificateAgent,
  getMembresiaCursosCommunityAgent,
  getMembresiaCursosEngagementAgent,
  getMembresiaCursosMonetizationAgent,
  getMembresiaCursosProgressAgent,
} from "../../../../../../../backend/os-agents/sectors/membresiacursos";

type MembresiaCursosLibraryAgentId =
  | "membresiacursos-builder"
  | "membresiacursos-access"
  | "membresiacursos-community"
  | "membresiacursos-progress"
  | "membresiacursos-monetization"
  | "membresiacursos-engagement"
  | "membresiacursos-analytics"
  | "membresiacursos-certificate";

const IDS: MembresiaCursosLibraryAgentId[] = [
  "membresiacursos-builder",
  "membresiacursos-access",
  "membresiacursos-community",
  "membresiacursos-progress",
  "membresiacursos-monetization",
  "membresiacursos-engagement",
  "membresiacursos-analytics",
  "membresiacursos-certificate",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceMembresiaCursosInput(userId: string, raw: unknown): MembresiaCursosInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const courseBrief = typeof raw.courseBrief === "string" ? raw.courseBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    courseBrief: courseBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO membresiacursos_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as MembresiaCursosLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceMembresiaCursosInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as MembresiaCursosLibraryAgentId) {
      case "membresiacursos-builder":
        result = await getMembresiaCursosBuilderAgent().run(input);
        break;
      case "membresiacursos-access":
        result = await getMembresiaCursosAccessAgent().run(input);
        break;
      case "membresiacursos-community":
        result = await getMembresiaCursosCommunityAgent().run(input);
        break;
      case "membresiacursos-progress":
        result = await getMembresiaCursosProgressAgent().run(input);
        break;
      case "membresiacursos-monetization":
        result = await getMembresiaCursosMonetizationAgent().run(input);
        break;
      case "membresiacursos-engagement":
        result = await getMembresiaCursosEngagementAgent().run(input);
        break;
      case "membresiacursos-analytics":
        result = await getMembresiaCursosAnalyticsAgent().run(input);
        break;
      case "membresiacursos-certificate":
        result = await getMembresiaCursosCertificateAgent().run(input);
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
